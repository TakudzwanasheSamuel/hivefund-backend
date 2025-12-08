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
import { LearningContent, LearningLevel } from './entities/learning-content.entity';
import { UserProgress } from './entities/user-progress.entity';
import { CreditService } from '../credit/credit.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class LearningService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(LearningContent)
    private learningContentRepository: Repository<LearningContent>,
    @InjectRepository(UserProgress)
    private userProgressRepository: Repository<UserProgress>,
    private creditService: CreditService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
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

    const systemPrompt = `You are an expert financial education instructor specializing in teaching youth about financial inclusion, savings groups (Mukando/ROSCAs), credit building, and entrepreneurship in Zimbabwe. 

Create comprehensive, practical, and engaging lesson content that is:
- Detailed and thorough (not brief - provide extensive explanations)
- Practical with real-world examples
- Culturally relevant to Zimbabwe
- Actionable with clear steps
- Appropriate for the specified difficulty level
- Include video recommendations for visual learners

Always structure your response as valid JSON with these exact fields:
- title: A clear, engaging lesson title
- overview: A detailed 4-6 sentence summary of what the lesson covers
- detailed_content: EXTENSIVE teaching content (8-12 paragraphs minimum) explaining the concept thoroughly with in-depth explanations, breaking down complex concepts, providing context, and ensuring complete understanding
- examples: An array of 4-6 detailed practical examples with explanations, showing real-world scenarios relevant to the topic
- steps: An array of 5-8 detailed actionable steps the learner can take, with explanations for each step
- quiz_questions: An array of 5-7 quiz questions with detailed correct answers and explanations
- summary: A comprehensive recap of all key takeaways (5-7 points)
- real_world_use_case: A detailed, specific scenario (2-3 paragraphs) showing how this applies in Zimbabwe with names, situations, and outcomes
- recommended_videos: An array of 3-5 video recommendations with titles, descriptions, and YouTube URLs (use actual relevant YouTube video IDs or search for relevant educational videos about the topic)
- additional_resources: An array of 2-3 additional learning resources (articles, tools, calculators) with descriptions and URLs
- key_terms: An array of important terms with definitions relevant to the topic
- difficulty_level: The difficulty level (Beginner, Growing, Established, or Trusted)

Make the content comprehensive, detailed, and immediately applicable. Provide extensive explanations, not brief summaries.`;

    const userPrompt = `Generate a COMPREHENSIVE and DETAILED lesson about: "${dto.topic}"

Difficulty Level: ${difficulty}
${dto.learningGoals ? `Learning Goals: ${dto.learningGoals}` : ''}
${userId ? `User Credit Score: ${userCreditScore} (${userLevel})` : ''}

Context: This is for HiveFund, a platform that digitizes Mukando (rotating savings groups) and helps youth build credit scores through consistent participation. The platform includes features for savings circles, micro-loans, storefronts, gig marketplace, and financial literacy.

IMPORTANT REQUIREMENTS:
1. Provide EXTENSIVE detailed_content (8-12 paragraphs minimum) - break down complex concepts, provide thorough explanations, include context and background information
2. Include 4-6 detailed examples with titles, descriptions, and key learning points
3. Provide 5-8 detailed steps with explanations for each step
4. Include 5-7 quiz questions with detailed answers and explanations
5. Provide comprehensive summary with 5-7 key takeaways
6. Include detailed real-world use case (2-3 paragraphs) with specific names, situations, and outcomes from Zimbabwe
7. Recommend 3-5 relevant YouTube videos with titles, descriptions, URLs, duration, and channel names (use actual relevant video IDs or search for educational videos about the topic)
8. Include 2-3 additional resources (guides, tools, articles) with descriptions and URLs
9. Define 5-7 key terms with clear definitions

Make the content comprehensive, detailed, and immediately applicable. Provide extensive explanations, not brief summaries. The user wants thorough, educational content that fully explains the topic.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000,
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
      throw new BadRequestException(
        `Failed to generate lesson: ${error.message}`,
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

    const systemPrompt = `You are a helpful financial advisor and educator specializing in HiveFund, a platform that digitizes Mukando (rotating savings groups) for Zimbabwean youth. You help users understand:

- Mukando and rotating savings groups
- Credit building and credit scores
- Loans and repayment
- Business and entrepreneurship
- Financial planning and budgeting
- Investment strategies

Provide clear, practical, and culturally relevant answers. Be concise but comprehensive. If the question is about HiveFund specifically, explain how the platform works. Always provide actionable advice.

Structure your response as JSON with:
- answer: A clear, direct answer to the question (2-4 paragraphs)
- key_points: An array of 3-5 key takeaways
- actionable_steps: An array of 2-4 steps the user can take
- related_topics: An array of 2-3 related topics they might want to learn about`;

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
        temperature: 0.7,
        max_tokens: 1500,
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
      throw new BadRequestException(
        `Failed to answer question: ${error.message}`,
      );
    }
  }
}
