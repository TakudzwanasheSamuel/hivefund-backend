import { Controller, Get, Post, Body, UseGuards, Query, Param } from '@nestjs/common';
import { 
  ApiTags, 
  ApiBearerAuth, 
  ApiBody, 
  ApiQuery, 
  ApiParam,
  ApiOperation, 
  ApiResponse,
  ApiOkResponse 
} from '@nestjs/swagger';
import { LearningService } from './learning.service';
import { CreateContentDto } from './dto/create-content.dto';
import { CompleteModuleDto } from './dto/complete-module.dto';
import { GenerateLessonDto } from './dto/generate-lesson.dto';
import { AskQuestionDto } from './dto/ask-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { LearningLevel } from './entities/learning-content.entity';

@ApiTags('Learning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post('content')
  @ApiOperation({ 
    summary: 'Create new learning content',
    description: 'Creates a new learning content item. Only accessible to authorized users. Content is organized by levels (Beginner, Growing, Established, Trusted) and can be locked based on credit score requirements.'
  })
  @ApiBody({ 
    type: CreateContentDto,
    description: 'Learning content details including title, type, level, topic, and credit score requirement'
  })
  @ApiOkResponse({ 
    description: 'Content created successfully',
    schema: {
      example: {
        id: 'uuid-here',
        title: 'How Mukando Works',
        description: 'Learn the fundamentals of how Mukando works',
        type: 'VIDEO',
        pointsReward: 10,
        level: 'Beginner',
        topic: 'Mukando Basics',
        minCreditScore: 0,
        url: 'https://example.com/learning/how-mukando-works',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  createContent(@Body() createContentDto: CreateContentDto) {
    return this.learningService.createContent(createContentDto);
  }

  @Get('content')
  @ApiOperation({ 
    summary: 'Get all learning content',
    description: 'Retrieves all learning content organized by levels (Beginner 0-299, Growing 300-499, Established 500-699, Trusted 700+). Shows completion status (✓ completed, ○ available, 🔒 locked) based on user\'s credit score. Supports filtering by level and topic. For topic-specific content with progress, use GET /learning/topic/:topicName instead.'
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: LearningLevel,
    description: 'Filter content by learning level. Options: Beginner, Growing, Established, Trusted',
    example: 'Beginner'
  })
  @ApiQuery({
    name: 'topic',
    required: false,
    type: String,
    description: 'Filter content by topic/category (e.g., "Mukando Basics", "Credit Score", "Loans")',
    example: 'Mukando Basics'
  })
  @ApiOkResponse({ 
    description: 'Content retrieved successfully with completion status',
    schema: {
      example: {
        levels: [
          {
            level: 'Beginner',
            label: 'Beginner (0-299)',
            range: { min: 0, max: 299 },
            content: [
              {
                id: 'uuid-here',
                title: 'How Mukando Works',
                description: 'Learn the fundamentals...',
                type: 'VIDEO',
                pointsReward: 10,
                topic: 'Mukando Basics',
                minCreditScore: 0,
                status: '✓',
                isCompleted: true,
                isLocked: false,
                level: 'Beginner'
              }
            ]
          }
        ],
        userCreditScore: 150
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  getAllContent(
    @Query('level') level?: LearningLevel,
    @Query('topic') topic?: string,
    @GetUser() user?: any,
  ) {
    return this.learningService.getAllContent(user?.userId, level, topic);
  }

  @Post('progress')
  @ApiOperation({ 
    summary: 'Mark learning content as complete',
    description: 'Marks a learning content item as completed for the authenticated user. Awards points to the user\'s credit score. Validates that the user has the required credit score to access the content. Prevents duplicate completions.'
  })
  @ApiBody({ 
    type: CompleteModuleDto,
    description: 'Content ID to mark as complete'
  })
  @ApiOkResponse({ 
    description: 'Module completed successfully and points awarded',
    schema: {
      example: {
        message: 'Module completed successfully!',
        pointsEarned: 10,
        contentTitle: 'How Mukando Works'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Content already completed or credit score too low' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Learning content not found' })
  markComplete(@Body() completeModuleDto: CompleteModuleDto, @GetUser() user: any) {
    return this.learningService.markComplete(user, completeModuleDto);
  }

  @Get('my-progress')
  @ApiOperation({ 
    summary: 'Get user learning progress',
    description: 'Retrieves the authenticated user\'s overall learning progress across all topics including all completed modules, total points earned, and completion statistics. For topic-specific progress, use GET /learning/topic/:topicName.'
  })
  @ApiOkResponse({ 
    description: 'User progress retrieved successfully',
    schema: {
      example: {
        completedModules: [
          {
            id: 'progress-uuid',
            contentId: 'content-uuid',
            title: 'How Mukando Works',
            type: 'VIDEO',
            pointsReward: 10,
            completedAt: '2024-01-01T00:00:00.000Z'
          }
        ],
        totalPointsEarned: 25,
        totalModulesCompleted: 2
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  getUserProgress(@GetUser() user: any) {
    return this.learningService.getUserProgress(user.userId);
  }

  @Get('topics')
  @ApiOperation({ 
    summary: 'Get available topics with progress',
    description: 'Retrieves all available learning topics with content counts and user progress. Use this to show users what topics they can learn about and their progress in each topic. Then use GET /learning/topic/:topicName to get all content for a specific topic.'
  })
  @ApiOkResponse({ 
    description: 'Topics retrieved successfully with progress information',
    schema: {
      example: {
        topics: [
          {
            name: 'Mukando Basics',
            totalContent: 4,
            completedContent: 2,
            availableContent: 2,
            completionPercentage: 50
          },
          {
            name: 'Credit Score',
            totalContent: 3,
            completedContent: 1,
            availableContent: 2,
            completionPercentage: 33
          }
        ],
        totalTopics: 8
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  getAvailableTopics(@GetUser() user?: any) {
    return this.learningService.getAvailableTopics(user?.userId);
  }

  @Post('generate-lesson')
  @ApiOperation({ 
    summary: 'Generate dynamic lesson using AI',
    description: 'Uses OpenAI to dynamically generate a comprehensive, structured lesson on any topic. The lesson is tailored to the user\'s credit score level and includes detailed content, examples, steps, quiz questions, and real-world use cases. Content is generated fresh for each request, ensuring it\'s always up-to-date and relevant.'
  })
  @ApiBody({ 
    type: GenerateLessonDto,
    description: 'Topic and optional difficulty level for lesson generation'
  })
  @ApiOkResponse({ 
    description: 'Lesson generated successfully with comprehensive content including detailed explanations, examples, recommended videos, and resources',
    schema: {
      example: {
        topic: 'How Mukando Works',
        difficultyLevel: 'Beginner',
        userCreditScore: 150,
        lesson: {
          title: 'Understanding Mukando: Your Path to Financial Freedom',
          overview: 'Mukando, also known as rotating savings and credit associations (ROSCAs), is a traditional savings method where members pool money together regularly. Each member receives the entire pool at their designated turn, creating a system of forced savings and interest-free borrowing. This comprehensive guide will teach you everything you need to know about how Mukando works, its benefits, risks, and how HiveFund digitizes this traditional practice for the modern age.',
          detailed_content: 'Mukando, also known as rotating savings and credit associations (ROSCAs), is a traditional savings method that has been used for centuries across Africa and other parts of the world. In Zimbabwe, Mukando represents more than just a savings mechanism—it\'s a cultural institution that combines financial discipline with community trust and mutual support.\n\nAt its core, Mukando is a group of people (typically 5-20 members) who agree to contribute a fixed amount of money at regular intervals (weekly, bi-weekly, or monthly). The total pool of money collected each period is given to one member, who is selected through rotation. This rotation continues until every member has received their turn, completing the cycle.\n\nThe beauty of Mukando lies in its simplicity and effectiveness. For members who receive their payout early in the rotation, it functions as an interest-free loan. They get access to a lump sum that they might not have been able to save individually, which they can use for investments, emergencies, or major purchases. For members who receive their payout later, it acts as a forced savings mechanism, ensuring they accumulate money they might otherwise have spent.\n\nHiveFund has taken this traditional concept and digitized it, bringing Mukando into the 21st century. Through the HiveFund platform, users can join or create digital savings circles, make contributions through secure digital payments, track their progress, and build credit scores through consistent participation. The platform eliminates the need for physical cash handling, reduces the risk of fraud, and provides transparency through digital records.\n\nOne of the key advantages of digital Mukando through HiveFund is credit building. Every contribution you make is recorded and contributes to your credit score. This credit score then unlocks access to larger loans, better interest rates, and more opportunities within the platform. Traditional Mukando doesn\'t build credit history, but HiveFund\'s digital version does, making it a powerful tool for financial inclusion.\n\nThe rotation order in Mukando can be determined in several ways: by drawing lots, by agreement, by need, or by bidding. In HiveFund, the rotation is typically determined when the circle is created, and members can see their position in the rotation. This transparency helps build trust and allows members to plan their finances accordingly.\n\nWhile Mukando offers many benefits, it\'s important to understand the risks. The biggest risk is member default—if a member fails to contribute, it disrupts the entire cycle. This is why trust is so important in traditional Mukando, and why HiveFund implements credit scores and verification to reduce this risk in digital circles.\n\nFor beginners, starting with a small contribution amount and joining an existing circle is often the best approach. This allows you to learn the process, build your credit score, and establish a track record before creating your own circle or joining larger ones. As you progress and your credit score increases, you\'ll unlock access to larger circles and more opportunities.',
          examples: [
            {
              title: 'Example 1: The 10-Person Weekly Circle',
              description: 'A group of 10 friends each contribute $20 every week. The total pool is $200 per week. Over 10 weeks, each member receives $200 once. Member 1 gets $200 in week 1, Member 2 in week 2, and so on. Early recipients get an interest-free loan, while later recipients benefit from forced savings.',
              key_learning: 'This shows how rotation works and the benefits for both early and late recipients.'
            },
            {
              title: 'Example 2: Using Payout to Start a Business',
              description: 'Tendai receives her $200 payout in week 3. She uses $150 to buy materials for her small jewelry business and saves $50. By the end of the cycle, her business has generated $300 in profit, allowing her to contribute more to the next cycle.',
              key_learning: 'Demonstrates how Mukando payouts can be used for income-generating activities.'
            },
            {
              title: 'Example 3: Emergency Use Case',
              description: 'Rudo needs $200 for a medical emergency in week 5. She negotiates with the group to receive her payout early. The group agrees because of her good track record, and she commits to continuing contributions.',
              key_learning: 'Shows how Mukando can provide emergency funds and the importance of trust.'
            },
            {
              title: 'Example 4: Building Credit Through HiveFund',
              description: 'Kudzai joins a HiveFund circle with a $10 weekly contribution. Over 6 months, she makes 24 consistent contributions, building her credit score from 0 to 240. This unlocks access to her first loan.',
              key_learning: 'Illustrates how digital Mukando builds credit history, unlike traditional methods.'
            }
          ],
          steps: [
            {
              step: 1,
              title: 'Understand Your Financial Capacity',
              description: 'Before joining a circle, calculate how much you can afford to contribute consistently. Review your monthly income and expenses, and set aside an amount you can commit to without financial strain. Remember, missing contributions can damage your credit score and disrupt the circle.',
              action: 'Create a budget and identify your affordable contribution amount.'
            },
            {
              step: 2,
              title: 'Join or Create a Circle',
              description: 'If you\'re new, join an existing circle through the HiveFund platform. Look for circles that match your contribution capacity and schedule. If you have experience and trust a group, you can create your own circle and invite members.',
              action: 'Browse available circles or create a new one in the HiveFund app.'
            },
            {
              step: 3,
              title: 'Set Circle Parameters',
              description: 'When creating a circle, decide on the contribution amount, frequency (weekly, bi-weekly, monthly), duration, and rotation order. Make sure all members agree to these terms before starting.',
              action: 'Set up circle details and get member agreement.'
            },
            {
              step: 4,
              title: 'Make Consistent Contributions',
              description: 'Set up automatic payments or reminders to ensure you never miss a contribution. Consistency is key to building your credit score and maintaining trust within the circle.',
              action: 'Enable payment reminders and make contributions on time.'
            },
            {
              step: 5,
              title: 'Receive Your Payout',
              description: 'When it\'s your turn, you\'ll receive the full pool amount. Plan how you\'ll use this money—whether for savings, investment, emergency, or debt repayment. Make wise decisions to maximize the benefit.',
              action: 'Receive payout and use it strategically.'
            },
            {
              step: 6,
              title: 'Continue Until Cycle Completion',
              description: 'Even after receiving your payout, continue making contributions until the cycle is complete. This ensures the circle continues successfully and you maintain your credit score.',
              action: 'Complete all remaining contributions in the cycle.'
            },
            {
              step: 7,
              title: 'Evaluate and Plan Next Cycle',
              description: 'After completing a cycle, evaluate your experience. Consider joining a larger circle, creating your own, or participating in multiple circles if your financial situation allows.',
              action: 'Reflect on your experience and plan your next steps.'
            }
          ],
          quiz_questions: [
            {
              question: 'What is the main benefit of Mukando for early recipients?',
              answer: 'Early recipients get an interest-free loan, allowing them to access a lump sum they might not have been able to save individually.',
              explanation: 'This is one of the key advantages of Mukando—it provides access to capital without interest charges.'
            },
            {
              question: 'How does HiveFund\'s digital Mukando differ from traditional Mukando?',
              answer: 'HiveFund digitizes Mukando by providing secure digital payments, transparent tracking, credit score building, and reduced fraud risk through digital records.',
              explanation: 'The digital platform maintains the core principles while adding modern benefits like credit building.'
            },
            {
              question: 'What is the biggest risk in Mukando?',
              answer: 'Member default—when a member fails to contribute, it disrupts the entire cycle and affects all members.',
              explanation: 'This is why trust and verification are so important, which HiveFund addresses through credit scores.'
            },
            {
              question: 'How does participating in Mukando help build credit in HiveFund?',
              answer: 'Every contribution is recorded and contributes to your credit score, which unlocks access to loans and other opportunities.',
              explanation: 'Unlike traditional Mukando, digital participation creates a credit history.'
            },
            {
              question: 'What should you consider before joining a Mukando circle?',
              answer: 'Your financial capacity to contribute consistently, the circle\'s contribution amount and schedule, and the trustworthiness of members.',
              explanation: 'Proper planning and evaluation are essential for successful participation.'
            }
          ],
          summary: [
            'Mukando is a rotating savings group where members contribute regularly and take turns receiving the full pool.',
            'Early recipients get interest-free loans, while later recipients benefit from forced savings.',
            'HiveFund digitizes Mukando, adding credit building, transparency, and security.',
            'Consistent participation builds your credit score, unlocking more opportunities.',
            'Proper planning and commitment are essential for successful participation.',
            'Digital Mukando reduces risks like fraud and default through verification and tracking.',
            'Use payouts strategically for investments, emergencies, or debt repayment.'
          ],
          real_world_use_case: 'Rudo is a 22-year-old university student in Harare who wants to start a small business selling handmade jewelry. She doesn\'t have savings or access to traditional bank loans. Through HiveFund, she joins a 12-person Mukando circle with a $15 weekly contribution.\n\nIn the first 3 months, Rudo makes consistent contributions, building her credit score from 0 to 180. When it\'s her turn in week 4, she receives $180 (12 members × $15). She uses $120 to buy materials (beads, wire, tools) and saves $60 as emergency funds.\n\nOver the next 8 weeks, Rudo continues contributing while building her jewelry business. She sells her products at the university and through social media, earning $50-80 per week. By the time the cycle completes, she has not only maintained her contributions but also grown her business.\n\nHer credit score reaches 240, unlocking access to her first HiveFund loan of $200, which she uses to expand her inventory. Rudo\'s success story demonstrates how Mukando, combined with HiveFund\'s credit-building system, can transform financial opportunities for young Zimbabweans.',
          recommended_videos: [
            {
              title: 'Understanding Rotating Savings Groups (ROSCAs)',
              description: 'A comprehensive explanation of how rotating savings groups work, their history, and benefits.',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              duration: '8:30',
              channel: 'Financial Education Channel'
            },
            {
              title: 'How to Start a Savings Circle',
              description: 'Step-by-step guide on creating and managing a successful savings circle.',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              duration: '12:15',
              channel: 'Money Management Tips'
            },
            {
              title: 'Building Credit Through Community Savings',
              description: 'Learn how participating in savings groups can help build your credit history.',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              duration: '10:45',
              channel: 'Credit Building Academy'
            },
            {
              title: 'Mukando Success Stories from Zimbabwe',
              description: 'Real stories from Zimbabweans who have benefited from Mukando and community savings.',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              duration: '15:20',
              channel: 'African Financial Stories'
            },
            {
              title: 'Digital Financial Inclusion in Africa',
              description: 'How technology is transforming traditional savings methods in Africa.',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              duration: '11:30',
              channel: 'Tech for Good'
            }
          ],
          additional_resources: [
            {
              title: 'HiveFund Circle Management Guide',
              description: 'Complete guide to managing circles, contributions, and payouts in HiveFund.',
              url: 'https://hivefund.com/guides/circle-management',
              type: 'Guide'
            },
            {
              title: 'Credit Score Calculator',
              description: 'Calculate how your contributions will affect your credit score over time.',
              url: 'https://hivefund.com/tools/credit-calculator',
              type: 'Tool'
            },
            {
              title: 'Mukando Best Practices',
              description: 'Learn best practices for successful Mukando participation and risk management.',
              url: 'https://hivefund.com/resources/mukando-best-practices',
              type: 'Article'
            }
          ],
          key_terms: [
            {
              term: 'Mukando',
              definition: 'A rotating savings and credit association (ROSCA) where members contribute regularly and take turns receiving the full pool.'
            },
            {
              term: 'ROSCA',
              definition: 'Rotating Savings and Credit Association - a group-based savings mechanism.'
            },
            {
              term: 'Rotation',
              definition: 'The order in which members receive the pooled contributions.'
            },
            {
              term: 'Contribution',
              definition: 'The fixed amount each member pays into the pool at regular intervals.'
            },
            {
              term: 'Payout',
              definition: 'The full pool amount received by a member when it\'s their turn in the rotation.'
            },
            {
              term: 'Credit Score',
              definition: 'A numerical representation of your creditworthiness in HiveFund, built through consistent contributions and responsible financial behavior.'
            }
          ],
          difficulty_level: 'Beginner',
          generated_at: '2024-01-01T00:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request or OpenAI API error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  generateLesson(
    @Body() generateLessonDto: GenerateLessonDto,
    @GetUser() user?: any,
  ) {
    return this.learningService.generateLesson(generateLessonDto, user?.userId);
  }

  @Get('topic/:topicName')
  @ApiOperation({ 
    summary: 'Get all content for a specific topic',
    description: 'Retrieves all learning content for a specific topic (e.g., "Mukando Basics", "Credit Score"). Returns content organized by level with detailed progress tracking including completion percentage, points earned, and status of each item (✓ completed, ○ available, 🔒 locked). Perfect for showing users all content about a topic they want to learn.'
  })
  @ApiParam({
    name: 'topicName',
    required: true,
    type: String,
    description: 'The topic name to get content for (e.g., "Mukando Basics", "Credit Score", "Loans")',
    example: 'Mukando Basics'
  })
  @ApiOkResponse({ 
    description: 'Content for topic retrieved successfully with progress',
    schema: {
      example: {
        topic: 'Mukando Basics',
        progress: {
          totalContent: 4,
          completed: 2,
          available: 1,
          locked: 1,
          completionPercentage: 50,
          totalPointsAvailable: 45,
          totalPointsEarned: 20,
          pointsRemaining: 25
        },
        userCreditScore: 150,
        content: [
          {
            id: 'uuid-here',
            title: 'How Mukando Works',
            description: 'Learn the fundamentals...',
            type: 'VIDEO',
            pointsReward: 10,
            level: 'Beginner',
            minCreditScore: 0,
            status: '✓',
            isCompleted: true,
            isLocked: false,
            completedAt: '2024-01-01T00:00:00.000Z',
            levelInfo: {
              level: 'Beginner',
              label: 'Beginner (0-299)'
            }
          }
        ],
        contentByLevel: {
          'Beginner': [],
          'Growing': []
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Topic not found - No content available for this topic' })
  getContentByTopic(
    @Param('topicName') topicName: string,
    @GetUser() user?: any,
  ) {
    return this.learningService.getContentByTopic(topicName, user?.userId);
  }

  // ============================================
  // TOP 10 RECOMMENDED TOPIC ENDPOINTS
  // ============================================

  @Get('topics/how-mukando-works')
  @ApiOperation({ 
    summary: 'Topic 1: How Mukando Works - The Complete Guide',
    description: 'Get a comprehensive AI-generated lesson about Mukando (rotating savings groups), their benefits, and how HiveFund digitizes traditional Mukando. Perfect for beginners starting their savings journey.'
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getHowMukandoWorks(@GetUser() user?: any) {
    return this.learningService.getHowMukandoWorks(user?.userId);
  }

  @Get('topics/building-credit-score')
  @ApiOperation({ 
    summary: 'Topic 2: Building Your First Credit Score',
    description: 'Learn how credit scores work in HiveFund and discover strategies to build your credit quickly. Essential for understanding how to unlock platform features.'
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBuildingCreditScore(@GetUser() user?: any) {
    return this.learningService.getBuildingCreditScore(user?.userId);
  }

  @Get('topics/budgeting-contributions')
  @ApiOperation({ 
    summary: 'Topic 3: Budgeting for Contributions',
    description: 'Master the art of budgeting to ensure you can consistently contribute to your circles. Learn to calculate affordable amounts and manage multiple commitments.'
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBudgetingForContributions(@GetUser() user?: any) {
    return this.learningService.getBudgetingForContributions(user?.userId);
  }

  @Get('topics/managing-multiple-circles')
  @ApiOperation({ 
    summary: 'Topic 4: Managing Multiple Circles',
    description: 'Learn advanced strategies for participating in multiple savings circles simultaneously. Discover how to time payouts and balance commitments effectively.'
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getManagingMultipleCircles(@GetUser() user?: any) {
    return this.learningService.getManagingMultipleCircles(user?.userId);
  }

  @Get('topics/when-to-take-first-loan')
  @ApiOperation({ 
    summary: 'Topic 5: When to Take Your First Loan',
    description: 'Understand loan eligibility, types, and when taking a loan makes financial sense. Learn to calculate loan affordability and make informed borrowing decisions.'
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getWhenToTakeFirstLoan(@GetUser() user?: any) {
    return this.learningService.getWhenToTakeFirstLoan(user?.userId);
  }

  @Get('topics/side-hustle-pricing')
  @ApiOperation({ 
    summary: 'Topic 6: Side Hustle Pricing Strategies',
    description: 'Learn how to price your products and services competitively in the Zimbabwean market. Master cost calculation, profit margins, and value-based pricing.'
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSideHustlePricing(@GetUser() user?: any) {
    return this.learningService.getSideHustlePricing(user?.userId);
  }

  @Get('topics/loan-repayment-strategies')
  @ApiOperation({ 
    summary: 'Topic 7: Loan Repayment Strategies',
    description: 'Master effective loan repayment strategies to build credit and avoid penalties. Learn to create repayment plans and prioritize payments.'
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getLoanRepaymentStrategies(@GetUser() user?: any) {
    return this.learningService.getLoanRepaymentStrategies(user?.userId);
  }

  @Get('topics/scaling-your-hustle')
  @ApiOperation({ 
    summary: 'Topic 8: Scaling Your Hustle',
    description: 'Learn when and how to scale your business for sustainable growth. Discover strategies for reinvesting profits, hiring, and market expansion.'
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getScalingYourHustle(@GetUser() user?: any) {
    return this.learningService.getScalingYourHustle(user?.userId);
  }

  @Get('topics/advanced-investment-strategies')
  @ApiOperation({ 
    summary: 'Topic 9: Advanced Investment Strategies',
    description: 'Explore sophisticated investment strategies for building long-term wealth. Learn about diversification, risk management, and building investment portfolios.'
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAdvancedInvestmentStrategies(@GetUser() user?: any) {
    return this.learningService.getAdvancedInvestmentStrategies(user?.userId);
  }

  @Get('topics/business-growth-planning')
  @ApiOperation({ 
    summary: 'Topic 10: Business Growth Planning',
    description: 'Develop comprehensive business growth plans with financial projections and strategic milestones. Learn about forecasting, metrics, and exit strategies.'
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBusinessGrowthPlanning(@GetUser() user?: any) {
    return this.learningService.getBusinessGrowthPlanning(user?.userId);
  }

  // ============================================
  // Q&A ENDPOINT
  // ============================================

  @Post('ask-question')
  @ApiOperation({ 
    summary: 'Ask a Question - Get AI-Powered Answers',
    description: 'Ask any question about HiveFund, Mukando, credit scores, loans, business, or financial planning. Get personalized, practical answers tailored to your credit score level and situation.'
  })
  @ApiBody({ 
    type: AskQuestionDto,
    description: 'Your question and optional context about your situation'
  })
  @ApiOkResponse({ 
    description: 'Question answered successfully',
    schema: {
      example: {
        question: 'How do I increase my credit score faster?',
        context: 'I have a credit score of 250 and want to reach 300',
        userCreditScore: 250,
        userLevel: 'Beginner',
        answer: {
          answer: 'To increase your credit score faster in HiveFund...',
          key_points: [
            'Make consistent contributions to your circles',
            'Complete learning modules for bonus points',
            'Avoid missing payments'
          ],
          actionable_steps: [
            'Join a circle and contribute weekly',
            'Complete beginner learning modules',
            'Set up automatic reminders for payments'
          ],
          related_topics: [
            'Building Your First Credit Score',
            'Budgeting for Contributions'
          ]
        },
        answered_at: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request or OpenAI API error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  askQuestion(
    @Body() askQuestionDto: AskQuestionDto,
    @GetUser() user?: any,
  ) {
    return this.learningService.answerQuestion(askQuestionDto, user?.userId);
  }
}
