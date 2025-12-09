import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CreateContentDto } from './dto/create-content.dto';
import { CompleteModuleDto } from './dto/complete-module.dto';
import { GenerateLessonDto } from './dto/generate-lesson.dto';
import { AskQuestionDto } from './dto/ask-question.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { BudgetAnswersDto } from './dto/budget-answers.dto';
import { LearningContent, LearningLevel } from './entities/learning-content.entity';
import { UserProgress } from './entities/user-progress.entity';
import { CreditService } from '../credit/credit.service';
import { User } from '../users/entities/user.entity';
import { Transaction, TransactionType, TransactionStatus } from '../payments/entities/transaction.entity';

@Injectable()
export class LearningService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(LearningContent)
    private learningContentRepository: Repository<LearningContent>,
    @InjectRepository(UserProgress)
    private userProgressRepository: Repository<UserProgress>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private creditService: CreditService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ 
        apiKey,
        timeout: 120000, // 2 minute timeout
        maxRetries: 1, // Single retry for speed
      });
    }
  }

  async getAllContent(userId?: string, level?: LearningLevel, topic?: string) {
    const queryBuilder = this.learningContentRepository.createQueryBuilder('content');

    if (level) {
      queryBuilder.where('content.level = :level', { level });
    }

    if (topic) {
      queryBuilder.andWhere('content.topic = :topic', { topic });
    }

    const content = await queryBuilder
      .orderBy('content.minCreditScore', 'ASC')
      .addOrderBy('content.title', 'ASC')
      .getMany();

    // If userId is provided, get user's credit score and progress
    let userCreditScore = 0;
    let completedContentIds: string[] = [];

    if (userId) {
      const creditInfo = await this.creditService.getCreditScore(userId);
      userCreditScore = creditInfo.score;

      const userProgress = await this.userProgressRepository.find({
        where: { userId },
        select: ['learningContentId'],
      });
      completedContentIds = userProgress.map((p) => p.learningContentId);
    }

    // Organize content by levels
    const levelRanges = {
      [LearningLevel.BEGINNER]: { min: 0, max: 299, label: 'Beginner (0-299)' },
      [LearningLevel.GROWING]: { min: 300, max: 499, label: 'Growing (300-499)' },
      [LearningLevel.ESTABLISHED]: { min: 500, max: 699, label: 'Established (500-699)' },
      [LearningLevel.TRUSTED]: { min: 700, max: Infinity, label: 'Trusted (700+)' },
    };

    const organizedContent: Record<string, any[]> = {};

    for (const [levelKey, range] of Object.entries(levelRanges)) {
      organizedContent[levelKey] = content
        .filter((item) => item.level === levelKey)
        .map((item) => {
          const isCompleted = completedContentIds.includes(item.id);
          const isLocked = userId ? item.minCreditScore > userCreditScore : false;

          let status = '○'; // Not completed
          if (isCompleted) {
            status = '✓';
          } else if (isLocked) {
            status = '🔒';
          }

          return {
            id: item.id,
            title: item.title,
            description: item.description,
            content: item.content,
            type: item.type,
            pointsReward: item.pointsReward,
            url: item.url,
            topic: item.topic,
            minCreditScore: item.minCreditScore,
            status,
            isCompleted,
            isLocked,
            level: item.level,
          };
        });
    }

    return {
      levels: Object.entries(levelRanges).map(([levelKey, range]) => ({
        level: levelKey,
        label: range.label,
        range: { min: range.min, max: range.max === Infinity ? null : range.max },
        content: organizedContent[levelKey] || [],
      })),
      userCreditScore: userId ? userCreditScore : null,
    };
  }

  async createContent(dto: CreateContentDto) {
    const content = this.learningContentRepository.create({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      pointsReward: dto.pointsReward,
      url: dto.url,
      level: dto.level,
      topic: dto.topic,
      minCreditScore: dto.minCreditScore || 0,
    });

    return await this.learningContentRepository.save(content);
  }

  async markComplete(user: any, dto: CompleteModuleDto) {
    // Check if content exists
    const content = await this.learningContentRepository.findOne({
      where: { id: dto.contentId },
    });

    if (!content) {
      throw new NotFoundException('Learning content not found');
    }

    // Check if user has required credit score
    const creditInfo = await this.creditService.getCreditScore(user.userId);
    if (content.minCreditScore > creditInfo.score) {
      throw new BadRequestException(
        `This content requires a credit score of ${content.minCreditScore}. Your current score is ${creditInfo.score}.`,
      );
    }

    // Check if UserProgress already exists (prevent double-dipping)
    const existingProgress = await this.userProgressRepository.findOne({
      where: {
        userId: user.userId,
        learningContentId: dto.contentId,
      },
    });

    if (existingProgress) {
      throw new BadRequestException('You have already completed this module');
    }

    // Create UserProgress
    const progress = this.userProgressRepository.create({
      user: { id: user.userId } as User,
      learningContent: content,
      completedAt: new Date(),
    });

    await this.userProgressRepository.save(progress);

    // Award points via CreditService
    await this.creditService.updateScore(
      user.userId,
      'learning_complete',
      content.pointsReward,
    );

    return {
      message: 'Module completed successfully!',
      pointsEarned: content.pointsReward,
      contentTitle: content.title,
    };
  }

  async getUserProgress(userId: string) {
    const progressList = await this.userProgressRepository.find({
      where: { userId },
      relations: ['learningContent'],
      order: { completedAt: 'DESC' },
    });

    // Calculate total points earned
    const totalPointsEarned = progressList.reduce(
      (sum, progress) => sum + progress.learningContent.pointsReward,
      0,
    );

    return {
      completedModules: progressList.map((progress) => ({
        id: progress.id,
        contentId: progress.learningContent.id,
        title: progress.learningContent.title,
        type: progress.learningContent.type,
        pointsReward: progress.learningContent.pointsReward,
        completedAt: progress.completedAt,
      })),
      totalPointsEarned: totalPointsEarned,
      totalModulesCompleted: progressList.length,
    };
  }

  async getAvailableTopics(userId?: string) {
    // Get all topics with content counts
    const topicsData = await this.learningContentRepository
      .createQueryBuilder('content')
      .select('content.topic', 'topic')
      .addSelect('COUNT(content.id)', 'count')
      .where('content.topic IS NOT NULL')
      .groupBy('content.topic')
      .getRawMany();

    // Get user's completed content by topic for progress
    let completedByTopic: Record<string, number> = {};
    if (userId) {
      const userProgress = await this.userProgressRepository.find({
        where: { userId },
        relations: ['learningContent'],
      });

      userProgress.forEach((progress) => {
        const topic = progress.learningContent.topic;
        if (topic) {
          completedByTopic[topic] = (completedByTopic[topic] || 0) + 1;
        }
      });
    }

    const topics = topicsData.map((item) => {
      const topic = item.topic;
      const totalCount = parseInt(item.count);
      const completedCount = completedByTopic[topic] || 0;

      return {
        name: topic,
        totalContent: totalCount,
        completedContent: completedCount,
        availableContent: totalCount - completedCount,
        completionPercentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      };
    });

    return {
      topics: topics.sort((a, b) => a.name.localeCompare(b.name)),
      totalTopics: topics.length,
    };
  }

  async getContentByTopic(topic: string, userId?: string) {
    // Decode URL-encoded topic name (handle spaces, special characters)
    const decodedTopic = decodeURIComponent(topic);
    
    // Get all content for this topic
    const content = await this.learningContentRepository.find({
      where: { topic: decodedTopic },
      order: { minCreditScore: 'ASC', title: 'ASC' },
    });

    if (content.length === 0) {
      throw new NotFoundException(`No content found for topic: ${decodedTopic}`);
    }

    // Get user's credit score and progress
    let userCreditScore = 0;
    let completedContentIds: string[] = [];
    let progressByContent: Record<string, any> = {};

    if (userId) {
      const creditInfo = await this.creditService.getCreditScore(userId);
      userCreditScore = creditInfo.score;

      const userProgress = await this.userProgressRepository.find({
        where: { userId },
        relations: ['learningContent'],
      });
      completedContentIds = userProgress.map((p) => p.learningContentId);
      
      // Create progress map for quick lookup
      userProgress.forEach((progress) => {
        progressByContent[progress.learningContentId] = {
          completedAt: progress.completedAt,
          pointsEarned: progress.learningContent.pointsReward,
        };
      });
    }

    // Calculate progress statistics
    const totalContent = content.length;
    const completedCount = content.filter((item) => completedContentIds.includes(item.id)).length;
    const availableCount = content.filter(
      (item) => !completedContentIds.includes(item.id) && item.minCreditScore <= userCreditScore,
    ).length;
    const lockedCount = content.filter(
      (item) => !completedContentIds.includes(item.id) && item.minCreditScore > userCreditScore,
    ).length;

    // Calculate total points available and earned
    const totalPointsAvailable = content.reduce((sum, item) => sum + item.pointsReward, 0);
    const totalPointsEarned = content
      .filter((item) => completedContentIds.includes(item.id))
      .reduce((sum, item) => sum + item.pointsReward, 0);

    // Organize content with progress information
    const contentWithProgress = content.map((item) => {
      const isCompleted = completedContentIds.includes(item.id);
      const isLocked = userId ? item.minCreditScore > userCreditScore : false;

      let status = '○'; // Not completed
      if (isCompleted) {
        status = '✓';
      } else if (isLocked) {
        status = '🔒';
      }

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        content: item.content,
        type: item.type,
        pointsReward: item.pointsReward,
        url: item.url,
        level: item.level,
        minCreditScore: item.minCreditScore,
        status,
        isCompleted,
        isLocked,
        completedAt: progressByContent[item.id]?.completedAt || null,
        // Group by level for better organization
        levelInfo: {
          level: item.level,
          label: this.getLevelLabel(item.level),
        },
      };
    });

    // Group content by level
    const contentByLevel = contentWithProgress.reduce((acc, item) => {
      if (!acc[item.level]) {
        acc[item.level] = [];
      }
      acc[item.level].push(item);
      return acc;
    }, {} as Record<string, typeof contentWithProgress>);

    return {
      topic: decodedTopic,
      progress: {
        totalContent,
        completed: completedCount,
        available: availableCount,
        locked: lockedCount,
        completionPercentage: totalContent > 0 ? Math.round((completedCount / totalContent) * 100) : 0,
        totalPointsAvailable,
        totalPointsEarned,
        pointsRemaining: totalPointsAvailable - totalPointsEarned,
      },
      userCreditScore: userId ? userCreditScore : null,
      content: contentWithProgress,
      contentByLevel,
    };
  }

  private getLevelLabel(level: LearningLevel): string {
    const labels = {
      [LearningLevel.BEGINNER]: 'Beginner (0-299)',
      [LearningLevel.GROWING]: 'Growing (300-499)',
      [LearningLevel.ESTABLISHED]: 'Established (500-699)',
      [LearningLevel.TRUSTED]: 'Trusted (700+)',
    };
    return labels[level] || level;
  }

  async generateLesson(dto: GenerateLessonDto, userId?: string) {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API key is not configured');
    }

    // Validate OpenAI client is properly initialized
    if (!this.configService.get<string>('OPENAI_API_KEY')) {
      throw new BadRequestException('OpenAI API key is missing from configuration');
    }

    // Get user's credit score to determine appropriate difficulty
    let userCreditScore = 0;
    let userLevel = LearningLevel.BEGINNER;
    
    if (userId) {
      const creditInfo = await this.creditService.getCreditScore(userId);
      userCreditScore = creditInfo.score;
      
      if (userCreditScore >= 700) {
        userLevel = LearningLevel.TRUSTED;
      } else if (userCreditScore >= 500) {
        userLevel = LearningLevel.ESTABLISHED;
      } else if (userCreditScore >= 300) {
        userLevel = LearningLevel.GROWING;
      } else {
        userLevel = LearningLevel.BEGINNER;
      }
    }

    // Use provided difficulty or user's level
    const difficulty = dto.difficultyLevel || userLevel;

    const systemPrompt = `You are a financial education instructor for HiveFund (digitizes Mukando for Zimbabwean youth). Create practical, concise lessons.

Structure your response as JSON with these fields:
- title: A clear, engaging lesson title
- overview: A brief 2-3 sentence summary
- detailed_content: Teaching content (3-5 paragraphs) explaining the concept clearly and concisely
- examples: An array of 2-3 practical examples with titles and brief descriptions
- steps: An array of 3-4 actionable steps with brief explanations
- quiz_questions: An array of 3-4 quiz questions with answers
- summary: A recap of 3-4 key takeaways
- real_world_use_case: A brief scenario (1 paragraph) showing how this applies in Zimbabwe
- recommended_videos: An array of 2 video recommendations with titles and YouTube URLs
- additional_resources: An array of 2 resources with descriptions and URLs
- key_terms: An array of 3-4 important terms with definitions
- difficulty_level: The difficulty level (Beginner, Growing, Established, or Trusted)

Keep content concise, practical, and focused. Prioritize clarity over length.`;

    const userPrompt = `Generate a COMPREHENSIVE and DETAILED lesson about: "${dto.topic}"

Difficulty Level: ${difficulty}
${dto.learningGoals ? `Learning Goals: ${dto.learningGoals}` : ''}
${userId ? `User Credit Score: ${userCreditScore} (${userLevel})` : ''}

Context: This is for HiveFund, a platform that digitizes Mukando (rotating savings groups) and helps youth build credit scores through consistent participation. The platform includes features for savings circles, micro-loans, storefronts, gig marketplace, and financial literacy.

IMPORTANT REQUIREMENTS:
1. Provide detailed_content (3-5 paragraphs) - clear, concise explanations
2. Include 2-3 practical examples with titles
3. Provide 3-4 actionable steps
4. Include 3-4 quiz questions with answers
5. Provide summary with 3-4 key takeaways
6. Include brief real-world use case (1 paragraph) with Zimbabwean context
7. Recommend 2 relevant YouTube videos with titles and URLs
8. Include 2 additional resources with URLs
9. Define 3-4 key terms

Keep responses concise and practical. Focus on essential information only.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5, // Lower temperature for faster, more deterministic responses
        max_tokens: 1500, // Reduced for faster generation
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new BadRequestException('Failed to generate lesson content');
      }

      const lessonData = JSON.parse(responseContent);

      // Validate and structure the response
      return {
        topic: dto.topic,
        difficultyLevel: difficulty,
        userCreditScore: userId ? userCreditScore : null,
        lesson: {
          title: lessonData.title || dto.topic,
          overview: lessonData.overview || '',
          detailed_content: lessonData.detailed_content || lessonData.content || '',
          examples: Array.isArray(lessonData.examples) ? lessonData.examples : [],
          steps: Array.isArray(lessonData.steps) ? lessonData.steps : [],
          quiz_questions: Array.isArray(lessonData.quiz_questions) 
            ? lessonData.quiz_questions 
            : [],
          summary: lessonData.summary || '',
          real_world_use_case: lessonData.real_world_use_case || lessonData.use_case || '',
          recommended_videos: Array.isArray(lessonData.recommended_videos) 
            ? lessonData.recommended_videos 
            : [],
          additional_resources: Array.isArray(lessonData.additional_resources) 
            ? lessonData.additional_resources 
            : [],
          key_terms: Array.isArray(lessonData.key_terms) 
            ? lessonData.key_terms 
            : [],
          difficulty_level: lessonData.difficulty_level || difficulty,
          generated_at: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid response format from AI service');
      }
      
      // Handle OpenAI API errors more gracefully
      if (error?.message?.includes('Connection') || error?.message?.includes('timeout')) {
        throw new BadRequestException(
          'AI service is temporarily unavailable. Please try again in a moment.',
        );
      }
      
      // Log the actual error for debugging but return user-friendly message
      console.error('OpenAI API Error:', error);
      throw new BadRequestException(
        `Failed to generate lesson: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Helper method to generate lesson for a specific topic
  private async generateTopicLesson(
    topic: string,
    difficultyLevel: LearningLevel,
    learningGoals: string,
    userId?: string,
  ) {
    const dto: GenerateLessonDto = {
      topic,
      difficultyLevel,
      learningGoals,
    };
    return this.generateLesson(dto, userId);
  }

  // Topic 1: How Mukando Works
  async getHowMukandoWorks(userId?: string) {
    return this.generateTopicLesson(
      'How Mukando Works: The Complete Guide',
      LearningLevel.BEGINNER,
      'Learn the fundamentals of rotating savings groups, their benefits, and how HiveFund digitizes traditional Mukando',
      userId,
    );
  }

  // Topic 2: Building Your First Credit Score
  async getBuildingCreditScore(userId?: string) {
    return this.generateTopicLesson(
      'Building Your First Credit Score',
      LearningLevel.BEGINNER,
      'Understand how credit scores work in HiveFund and learn strategies to build your credit quickly',
      userId,
    );
  }

  // Topic 3: Budgeting for Contributions
  async getBudgetingForContributions(userId?: string) {
    return this.generateTopicLesson(
      'Budgeting for Contributions',
      LearningLevel.BEGINNER,
      'Master the art of budgeting to ensure you can consistently contribute to your circles',
      userId,
    );
  }

  // Topic 4: Managing Multiple Circles
  async getManagingMultipleCircles(userId?: string) {
    return this.generateTopicLesson(
      'Managing Multiple Circles',
      LearningLevel.GROWING,
      'Learn advanced strategies for participating in multiple savings circles simultaneously',
      userId,
    );
  }

  // Topic 5: When to Take Your First Loan
  async getWhenToTakeFirstLoan(userId?: string) {
    return this.generateTopicLesson(
      'When to Take Your First Loan',
      LearningLevel.GROWING,
      'Understand loan eligibility, types, and when taking a loan makes financial sense',
      userId,
    );
  }

  // Topic 6: Side Hustle Pricing Strategies
  async getSideHustlePricing(userId?: string) {
    return this.generateTopicLesson(
      'Side Hustle Pricing Strategies',
      LearningLevel.GROWING,
      'Learn how to price your products and services competitively in the Zimbabwean market',
      userId,
    );
  }

  // Topic 7: Loan Repayment Strategies
  async getLoanRepaymentStrategies(userId?: string) {
    return this.generateTopicLesson(
      'Loan Repayment Strategies',
      LearningLevel.ESTABLISHED,
      'Master effective loan repayment strategies to build credit and avoid penalties',
      userId,
    );
  }

  // Topic 8: Scaling Your Hustle
  async getScalingYourHustle(userId?: string) {
    return this.generateTopicLesson(
      'Scaling Your Hustle',
      LearningLevel.ESTABLISHED,
      'Learn when and how to scale your business for sustainable growth',
      userId,
    );
  }

  // Topic 9: Advanced Investment Strategies
  async getAdvancedInvestmentStrategies(userId?: string) {
    return this.generateTopicLesson(
      'Advanced Investment Strategies',
      LearningLevel.TRUSTED,
      'Explore sophisticated investment strategies for building long-term wealth',
      userId,
    );
  }

  // Topic 10: Business Growth Planning
  async getBusinessGrowthPlanning(userId?: string) {
    return this.generateTopicLesson(
      'Business Growth Planning',
      LearningLevel.TRUSTED,
      'Develop comprehensive business growth plans with financial projections and strategic milestones',
      userId,
    );
  }

  // Answer user questions
  async answerQuestion(dto: AskQuestionDto, userId?: string) {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API key is not configured');
    }

    // Get user's credit score for context
    let userCreditScore = 0;
    let userLevel = LearningLevel.BEGINNER;
    
    if (userId) {
      const creditInfo = await this.creditService.getCreditScore(userId);
      userCreditScore = creditInfo.score;
      
      if (userCreditScore >= 700) {
        userLevel = LearningLevel.TRUSTED;
      } else if (userCreditScore >= 500) {
        userLevel = LearningLevel.ESTABLISHED;
      } else if (userCreditScore >= 300) {
        userLevel = LearningLevel.GROWING;
      } else {
        userLevel = LearningLevel.BEGINNER;
      }
    }

    const systemPrompt = `You are a financial advisor for HiveFund (digitizes Mukando for Zimbabwean youth). Provide concise, practical answers.

Structure your response as JSON with:
- answer: A clear answer (1-2 paragraphs)
- key_points: An array of 2-3 key takeaways
- actionable_steps: An array of 2-3 steps
- related_topics: An array of 2 related topics

Keep responses brief and actionable.`;

    const userPrompt = `Question: "${dto.question}"
${dto.context ? `Context: ${dto.context}` : ''}
${userId ? `User Credit Score: ${userCreditScore} (${userLevel} level)` : ''}

Please provide a helpful, practical answer that's relevant to HiveFund and financial inclusion in Zimbabwe.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5, // Lower temperature for faster responses
        max_tokens: 800, // Reduced for faster generation
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new BadRequestException('Failed to generate answer');
      }

      const answerData = JSON.parse(responseContent);

      return {
        question: dto.question,
        context: dto.context || null,
        userCreditScore: userId ? userCreditScore : null,
        userLevel: userId ? userLevel : null,
        answer: {
          answer: answerData.answer || '',
          key_points: Array.isArray(answerData.key_points) ? answerData.key_points : [],
          actionable_steps: Array.isArray(answerData.actionable_steps) ? answerData.actionable_steps : [],
          related_topics: Array.isArray(answerData.related_topics) ? answerData.related_topics : [],
        },
        answered_at: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid response format from AI service');
      }
      
      // Handle OpenAI API errors more gracefully
      if (error?.message?.includes('Connection') || error?.message?.includes('timeout')) {
        throw new BadRequestException(
          'AI service is temporarily unavailable. Please try again in a moment.',
        );
      }
      
      console.error('OpenAI API Error:', error);
      throw new BadRequestException(
        `Failed to answer question: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Get user balance from transactions
  private async getUserBalance(userId: string): Promise<number> {
    const transactions = await this.transactionRepository.find({
      where: {
        userId,
        status: TransactionStatus.COMPLETED,
      },
    });

    // Calculate balance: contributions are negative (money out), loans are positive (money in)
    let balance = 0;
    transactions.forEach((transaction) => {
      if (transaction.type === TransactionType.CONTRIBUTION) {
        balance -= Number(transaction.amount);
      } else if (transaction.type === TransactionType.LOAN) {
        balance += Number(transaction.amount);
      }
    });

    return Math.max(0, balance); // Don't return negative balance
  }

  // Get budget questions (step 1)
  async getBudgetQuestions(userId?: string) {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API key is not configured');
    }

    // Get user's current balance
    let userBalance = 0;
    let userCreditScore = 0;
    let userLevel = LearningLevel.BEGINNER;
    
    if (userId) {
      userBalance = await this.getUserBalance(userId);
      const creditInfo = await this.creditService.getCreditScore(userId);
      userCreditScore = creditInfo.score;
      
      if (userCreditScore >= 700) {
        userLevel = LearningLevel.TRUSTED;
      } else if (userCreditScore >= 500) {
        userLevel = LearningLevel.ESTABLISHED;
      } else if (userCreditScore >= 300) {
        userLevel = LearningLevel.GROWING;
      } else {
        userLevel = LearningLevel.BEGINNER;
      }
    }

    // Return structured questions
    return {
      userBalance: userId ? userBalance : null,
      userCreditScore: userId ? userCreditScore : null,
      userLevel: userId ? userLevel : null,
      questions: [
        {
          id: 'monthly_income',
          question: 'What is your monthly income?',
          type: 'number',
          required: true,
          placeholder: 'Enter your monthly income in USD',
          helpText: 'Include all sources of income: salary, business, side hustles, etc.',
        },
        {
          id: 'expenses',
          question: 'What are your monthly expenses?',
          type: 'expense_list',
          required: true,
          helpText: 'List all your monthly expenses. Click "Add Expense" to add more.',
          example: [
            { category: 'Rent', amount: 500, priority: 'Essential' },
            { category: 'Food', amount: 300, priority: 'Essential' },
            { category: 'Transport', amount: 100, priority: 'Important' },
          ],
        },
        {
          id: 'financial_goals',
          question: 'What are your financial goals?',
          type: 'text',
          required: false,
          placeholder: 'e.g., Save for a laptop, start a business, build emergency fund',
          helpText: 'Describe what you want to achieve financially in the next few months.',
        },
        {
          id: 'interests',
          question: 'What are your interests or plans?',
          type: 'text',
          required: false,
          placeholder: 'e.g., Starting a business, learning new skills, investing',
          helpText: 'Tell us about your interests or plans that might affect your spending.',
        },
        {
          id: 'budget_name',
          question: 'What would you like to name this budget?',
          type: 'text',
          required: false,
          placeholder: 'e.g., Monthly Budget, January Budget',
          helpText: 'Give your budget a name to help you identify it later.',
        },
      ],
    };
  }

  // Generate budget plan from answers (step 2)
  async generateBudgetPlan(dto: BudgetAnswersDto, userId?: string) {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API key is not configured');
    }

    // Get user's current balance
    let userBalance = 0;
    let userCreditScore = 0;
    let userLevel = LearningLevel.BEGINNER;
    
    if (userId) {
      userBalance = await this.getUserBalance(userId);
      const creditInfo = await this.creditService.getCreditScore(userId);
      userCreditScore = creditInfo.score;
      
      if (userCreditScore >= 700) {
        userLevel = LearningLevel.TRUSTED;
      } else if (userCreditScore >= 500) {
        userLevel = LearningLevel.ESTABLISHED;
      } else if (userCreditScore >= 300) {
        userLevel = LearningLevel.GROWING;
      } else {
        userLevel = LearningLevel.BEGINNER;
      }
    }

    const systemPrompt = `You are a budgeting expert for Zimbabwean youth. Create practical spending plans.

Structure your response as JSON with:
- budget_summary: Brief overview (1-2 sentences)
- monthly_breakdown: Object with income, total_expenses, savings_amount, remaining_amount, savings_percentage
- spending_plan: Plan with essential_expenses, important_expenses, optional_expenses, savings_allocation
- expense_analysis: Brief analysis of expense categories
- savings_strategy: Brief strategy for financial goals
- spending_recommendations: Array of 3-4 recommendations
- action_plan: Array of 3-4 actionable steps
- tips: Array of 3-4 personalized tips
- warnings: Any financial risks (if applicable)
- next_steps: 2-3 next steps

Keep responses concise and actionable.`;

    const totalExpenses = dto.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const savings = dto.monthlyIncome - totalExpenses;
    const savingsPercentage = dto.monthlyIncome > 0 ? (savings / dto.monthlyIncome) * 100 : 0;

    const userPrompt = `Create a comprehensive spending plan for this user:

User Information:
- Current Balance: $${userBalance.toFixed(2)}
- Credit Score: ${userCreditScore} (${userLevel} level)
- Monthly Income: $${dto.monthlyIncome}
- Total Expenses: $${totalExpenses}
- Available for Savings: $${savings.toFixed(2)} (${savingsPercentage.toFixed(1)}% of income)

Expenses Breakdown:
${dto.expenses.map(exp => `- ${exp.category}: $${exp.amount} (${exp.priority || 'Not specified'})`).join('\n')}

Financial Goals: ${dto.financialGoals || 'Not specified'}
Interests: ${dto.interests || 'Not specified'}

Context: This is for HiveFund, a platform that digitizes Mukando (rotating savings groups) and helps youth build credit scores. The user may be participating in savings circles, taking loans, or running small businesses.

Create a detailed spending plan that:
1. Analyzes their current spending
2. Provides recommendations on how to spend their money wisely
3. Creates a savings strategy based on their goals
4. Includes actionable steps to implement the budget
5. Warns about any financial risks

Focus on creating a practical, actionable spending plan that helps them achieve their financial goals.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5, // Lower temperature for faster responses
        max_tokens: 1200, // Reduced for faster generation
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new BadRequestException('Failed to generate budget plan');
      }

      const planData = JSON.parse(responseContent);

      return {
        userBalance: userId ? userBalance : null,
        userCreditScore: userId ? userCreditScore : null,
        userLevel: userId ? userLevel : null,
        budgetName: dto.budgetName || 'My Budget',
        userInput: {
          monthlyIncome: dto.monthlyIncome,
          expenses: dto.expenses,
          totalExpenses: totalExpenses,
          financialGoals: dto.financialGoals || null,
          interests: dto.interests || null,
        },
        budget_summary: planData.budget_summary || '',
        monthly_breakdown: {
          income: dto.monthlyIncome,
          total_expenses: totalExpenses,
          savings_amount: savings,
          remaining_amount: savings,
          savings_percentage: parseFloat(savingsPercentage.toFixed(2)),
          ...planData.monthly_breakdown,
        },
        spending_plan: planData.spending_plan || {},
        expense_analysis: planData.expense_analysis || [],
        savings_strategy: planData.savings_strategy || '',
        spending_recommendations: Array.isArray(planData.spending_recommendations) 
          ? planData.spending_recommendations 
          : [],
        action_plan: Array.isArray(planData.action_plan) 
          ? planData.action_plan 
          : [],
        tips: Array.isArray(planData.tips) ? planData.tips : [],
        warnings: Array.isArray(planData.warnings) ? planData.warnings : [],
        next_steps: Array.isArray(planData.next_steps) ? planData.next_steps : [],
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid response format from AI service');
      }
      
      // Handle OpenAI API errors more gracefully
      if (error?.message?.includes('Connection') || error?.message?.includes('timeout')) {
        throw new BadRequestException(
          'AI service is temporarily unavailable. Please try again in a moment.',
        );
      }
      
      console.error('OpenAI API Error:', error);
      throw new BadRequestException(
        `Failed to generate budget plan: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Legacy method - kept for backward compatibility but redirects to new flow
  async createBudget(dto: CreateBudgetDto, userId?: string) {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API key is not configured');
    }

    // Get user's current balance
    let userBalance = 0;
    let userCreditScore = 0;
    let userLevel = LearningLevel.BEGINNER;
    
    if (userId) {
      userBalance = await this.getUserBalance(userId);
      const creditInfo = await this.creditService.getCreditScore(userId);
      userCreditScore = creditInfo.score;
      
      if (userCreditScore >= 700) {
        userLevel = LearningLevel.TRUSTED;
      } else if (userCreditScore >= 500) {
        userLevel = LearningLevel.ESTABLISHED;
      } else if (userCreditScore >= 300) {
        userLevel = LearningLevel.GROWING;
      } else {
        userLevel = LearningLevel.BEGINNER;
      }
    }

    const systemPrompt = `You are a budgeting expert for Zimbabwean youth. Create practical budgets.

Structure your response as JSON with:
- questions_to_ask: Array of 2-3 questions (if info missing)
- budget_analysis: Brief analysis of financial situation
- monthly_budget: Object with income, expenses, savings, remaining
- expense_categories: Array of categories with amounts
- savings_recommendations: Array of 2-3 strategies
- action_items: Array of 3-4 steps
- tips: Array of 3-4 tips
- warnings: Financial risks (if any)
- next_steps: 2-3 next steps

Keep responses concise and actionable.`;

    // Build user context
    let userContext = '';
    if (userId) {
      userContext = `User Balance: $${userBalance.toFixed(2)}
User Credit Score: ${userCreditScore} (${userLevel} level)
`;
    }

    const providedInfo = [];
    if (dto.monthlyIncome) providedInfo.push(`Monthly Income: $${dto.monthlyIncome}`);
    if (dto.expenses && dto.expenses.length > 0) {
      providedInfo.push(`Expenses: ${JSON.stringify(dto.expenses)}`);
    }
    if (dto.financialGoals) providedInfo.push(`Financial Goals: ${dto.financialGoals}`);
    if (dto.interests) providedInfo.push(`Interests: ${dto.interests}`);

    const userPrompt = `Create a comprehensive, personalized budget for this user.

${userContext}
${providedInfo.length > 0 ? `Provided Information:\n${providedInfo.join('\n')}` : 'No information provided - ask questions to understand their situation'}

${dto.budgetName ? `Budget Name: ${dto.budgetName}` : ''}

Context: This is for HiveFund, a platform that digitizes Mukando (rotating savings groups) and helps youth build credit scores. The user may be participating in savings circles, taking loans, or running small businesses.

${!dto.monthlyIncome || !dto.expenses || dto.expenses.length === 0 ? 'IMPORTANT: The user has not provided complete information. Generate questions to ask them about their income, expenses, and financial goals.' : 'The user has provided information. Create a detailed budget based on this.'}

Generate a comprehensive budget plan that helps them manage their money effectively and achieve their goals.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5, // Lower temperature for faster responses
        max_tokens: 1200, // Reduced for faster generation
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new BadRequestException('Failed to generate budget');
      }

      const budgetData = JSON.parse(responseContent);

      return {
        userBalance: userId ? userBalance : null,
        userCreditScore: userId ? userCreditScore : null,
        userLevel: userId ? userLevel : null,
        budgetName: dto.budgetName || 'My Budget',
        questions_to_ask: Array.isArray(budgetData.questions_to_ask) 
          ? budgetData.questions_to_ask 
          : [],
        budget_analysis: budgetData.budget_analysis || '',
        monthly_budget: budgetData.monthly_budget || {},
        expense_categories: Array.isArray(budgetData.expense_categories) 
          ? budgetData.expense_categories 
          : [],
        savings_recommendations: Array.isArray(budgetData.savings_recommendations) 
          ? budgetData.savings_recommendations 
          : [],
        action_items: Array.isArray(budgetData.action_items) 
          ? budgetData.action_items 
          : [],
        tips: Array.isArray(budgetData.tips) ? budgetData.tips : [],
        warnings: Array.isArray(budgetData.warnings) ? budgetData.warnings : [],
        next_steps: budgetData.next_steps || [],
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid response format from AI service');
      }
      
      // Handle OpenAI API errors more gracefully
      if (error?.message?.includes('Connection') || error?.message?.includes('timeout')) {
        throw new BadRequestException(
          'AI service is temporarily unavailable. Please try again in a moment.',
        );
      }
      
      console.error('OpenAI API Error:', error);
      throw new BadRequestException(
        `Failed to create budget: ${error?.message || 'Unknown error'}`,
      );
    }
  }
}
