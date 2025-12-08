# Learning Content Seed Script Explanation

This document explains how to use the learning content seed script to populate the HiveFund database with comprehensive financial literacy content.

## Overview

The seed script (`src/database/seeds/seed-learning-content.ts`) contains **38 learning content items** organized by credit score tiers:

- **Beginner (0-299):** 10 items
- **Growing (300-499):** 10 items  
- **Established (500-699):** 10 items
- **Trusted (700+):** 8 items

## Prerequisites

1. **Database Setup:** Ensure PostgreSQL is running and the `hive_fund` database exists
2. **Environment Variables:** Your `.env` file must contain:
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USER=postgres
   DATABASE_PASSWORD=your_password
   DATABASE_NAME=hive_fund
   ```
3. **Dependencies:** All npm packages must be installed (`npm install`)

## Running the Seed Script

### Method 1: Using npm script (Recommended)

```bash
npm run seed:learning
```

### Method 2: Direct execution

```bash
ts-node src/database/seeds/seed-learning-content.ts
```

## What the Script Does

1. **Connects to Database:** Uses TypeORM DataSource to connect to PostgreSQL
2. **Checks Existing Content:** Counts existing learning content items
3. **Processes Each Item:**
   - Checks if content with the same title already exists
   - If exists: Skips (logs "Skipped")
   - If new: Creates and saves (logs "Created")
4. **Shows Summary:**
   - Total created vs skipped
   - Breakdown by credit score level
   - Breakdown by topic
5. **Closes Connection:** Safely closes database connection

## Example Output

```
Connecting to database...
✅ Database connected!

⚠️  Found 5 existing learning content items.
   New content will be added (duplicates by title will be skipped).

📚 Seeding learning content...

✅ Created: "How Mukando Works: The Complete Guide" [Beginner]
✅ Created: "Understanding Rotating Savings Groups" [Beginner]
⏭️  Skipped: "Building Your First Credit Score" (already exists)
✅ Created: "Credit Score Basics: What You Need to Know" [Beginner]
...

✨ Learning content seeding completed!
📊 Summary:
   ✅ Created: 33 items
   ⏭️  Skipped: 5 items
   📦 Total in database: 38 items

📈 Content breakdown by level:
   🌱 Beginner (0-299): 10 items
   📈 Growing (300-499): 10 items
   🏆 Established (500-699): 10 items
   ⭐ Trusted (700+): 8 items
   📚 Total: 38 items

📂 Content by topic:
   Business: 7 items
   Loans: 5 items
   Financial Planning: 8 items
   Credit Score: 6 items
   ...

✅ Database connection closed.
```

## Content Structure

Each content item includes:

```typescript
{
  title: string;              // Content title
  description: string;        // Detailed description
  type: LearningContentType;  // VIDEO, ARTICLE, or QUIZ
  pointsReward: number;       // Credit points awarded on completion
  level: LearningLevel;       // BEGINNER, GROWING, ESTABLISHED, TRUSTED
  topic: string;             // Topic category
  minCreditScore: number;    // Minimum credit score required
  url: string;               // YouTube URL or article link
}
```

## Important Notes

### YouTube URLs

⚠️ **Important:** The YouTube URLs in the seed script are **placeholders**. Before running in production:

1. Replace placeholder URLs with actual relevant YouTube videos
2. Ensure videos are:
   - Relevant to the topic
   - Appropriate for the target audience
   - Available and not region-locked
   - In appropriate language (English or local languages)

### Duplicate Prevention

The script prevents duplicates by checking the `title` field. If you want to update existing content:

1. **Option 1:** Delete the existing content from the database first
2. **Option 2:** Modify the title in the seed script
3. **Option 3:** Manually update via API: `PUT /learning/content/:id`

### Idempotency

The script is **idempotent** - you can run it multiple times safely:
- Existing content (by title) will be skipped
- New content will be added
- No data will be lost or duplicated

## Customizing Content

### Adding New Content

1. Open `src/database/seeds/seed-learning-content.ts`
2. Add a new object to the `learningContentData` array:

```typescript
{
  title: 'Your New Content Title',
  description: 'Description of the content',
  type: LearningContentType.VIDEO,
  pointsReward: 15,
  level: LearningLevel.BEGINNER,
  topic: 'Your Topic',
  minCreditScore: 0,
  url: 'https://www.youtube.com/watch?v=...',
}
```

3. Run the seed script again

### Modifying Existing Content

1. Find the content item in the `learningContentData` array
2. Modify the fields you want to change
3. **Important:** Change the `title` if you want to create a new entry, or delete the old one from the database first
4. Run the seed script

### Removing Content

1. Remove the item from the `learningContentData` array
2. Manually delete from database if needed:
   ```sql
   DELETE FROM learning_content WHERE title = 'Content Title';
   ```

## Troubleshooting

### Error: DATABASE_PASSWORD is not set

**Solution:** Create a `.env` file in the root directory with database credentials.

### Error: Cannot connect to database

**Possible causes:**
- PostgreSQL is not running
- Wrong database credentials
- Database doesn't exist

**Solution:**
1. Check PostgreSQL is running: `pg_isready` or check services
2. Verify credentials in `.env`
3. Create database if needed: `CREATE DATABASE hive_fund;`

### Error: Entity metadata not found

**Solution:** Ensure the LearningContent entity is properly imported and the path is correct in the DataSource configuration.

### Content not appearing in API

**Possible causes:**
- Content was created but user's credit score is too low
- Content type mismatch
- Database connection issues in the API

**Solution:**
1. Check content exists: Query database directly
2. Verify user's credit score meets `minCreditScore` requirement
3. Check API logs for errors

## Best Practices

1. **Backup First:** Always backup your database before running seed scripts
2. **Test Environment:** Test seed script in development before production
3. **Review URLs:** Verify all YouTube URLs are valid and appropriate
4. **Version Control:** Commit seed script changes to track content updates
5. **Documentation:** Update `LEARNING_CONTENT_CATALOG.md` when adding new content

## Integration with API

After seeding, content is available via:

- `GET /learning/content` - Get all content (filtered by user's credit score)
- `GET /learning/content?level=Beginner` - Filter by level
- `GET /learning/content?topic=Business` - Filter by topic
- `POST /learning/progress` - Mark content as complete
- `GET /learning/my-progress` - Get user's progress

## Next Steps

After running the seed script:

1. ✅ Verify content appears in the API
2. ✅ Test content filtering by credit score
3. ✅ Test content completion flow
4. ✅ Update frontend to display content
5. ✅ Replace placeholder YouTube URLs with actual videos
6. ✅ Test with real users

## Support

For issues or questions:
- Check the main documentation: `LEARNING_CONTENT_GUIDE.md`
- Review the catalog: `LEARNING_CONTENT_CATALOG.md`
- Check API documentation: `/api` (Swagger UI)

