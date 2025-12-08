# Learning Content Management Guide

This guide explains how to add learning content to the HiveFund system using two methods:
1. **Via API** - Add content dynamically through HTTP requests
2. **Via Migration/Seed Script** - Bulk add content using a database seed script

---

## Method 1: Adding Content via API

### Prerequisites
- Your backend server must be running
- You need a valid JWT authentication token
- You must be authenticated as an admin/user with permission to create content

### Step 1: Get Authentication Token

First, login to get your JWT token:

```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "phoneNumber": "your-phone-number",
  "password": "your-password"
}
```

Response will include a `token` - save this for the next step.

### Step 2: Create Learning Content

Use the token to create content:

```bash
POST http://localhost:3000/learning/content
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "How Mukando Works",
  "description": "Learn the fundamentals of how Mukando (rotating savings groups) function and their benefits.",
  "type": "VIDEO",
  "pointsReward": 10,
  "level": "Beginner",
  "topic": "Mukando Basics",
  "minCreditScore": 0,
  "url": "https://example.com/learning/how-mukando-works"
}
```

### Available Fields

| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `title` | string | ✅ Yes | Content title | "How Mukando Works" |
| `description` | string | ❌ No | Content description | "Learn the fundamentals..." |
| `type` | enum | ✅ Yes | Content type | `VIDEO`, `ARTICLE`, `QUIZ` |
| `pointsReward` | number | ✅ Yes | Points awarded on completion | `10`, `15`, `20` |
| `level` | enum | ✅ Yes | Learning level | `Beginner`, `Growing`, `Established`, `Trusted` |
| `topic` | string | ❌ No | Content topic/category | "Mukando Basics", "Credit Score" |
| `minCreditScore` | number | ❌ No | Minimum credit score required (default: 0) | `0`, `300`, `500`, `700` |
| `url` | string | ❌ No | Content URL | "https://example.com/..." |

### Example: Creating All Beginner Content

```bash
# 1. How Mukando Works
curl -X POST http://localhost:3000/learning/content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "How Mukando Works",
    "description": "Learn the fundamentals of how Mukando works",
    "type": "VIDEO",
    "pointsReward": 10,
    "level": "Beginner",
    "topic": "Mukando Basics",
    "minCreditScore": 0,
    "url": "https://example.com/learning/how-mukando-works"
  }'

# 2. Building Your First Credit Score
curl -X POST http://localhost:3000/learning/content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Building Your First Credit Score",
    "description": "Understand how credit scores work",
    "type": "ARTICLE",
    "pointsReward": 15,
    "level": "Beginner",
    "topic": "Credit Score",
    "minCreditScore": 0,
    "url": "https://example.com/learning/building-credit-score"
  }'

# Continue for other content items...
```

### Using Postman or Swagger

1. **Swagger UI**: Navigate to `http://localhost:3000/api` (if Swagger is enabled)
2. Find the `POST /learning/content` endpoint
3. Click "Authorize" and enter your Bearer token
4. Fill in the request body and execute

---

## Method 2: Adding Content via Seed Script (Recommended for Bulk)

This method is ideal when you want to add multiple content items at once or set up initial content.

### Step 1: Review the Seed Script

The seed script is located at:
```
src/database/seeds/seed-learning-content.ts
```

It contains all the learning content items organized by level:
- **Beginner (0-299)**: 4 items
- **Growing (300-499)**: 4 items
- **Established (500-699)**: 4 items
- **Trusted (700+)**: 3 items

### Step 2: Customize Content (Optional)

Edit `seed-learning-content.ts` to:
- Modify existing content
- Add new content items
- Change URLs, descriptions, or points

### Step 3: Run the Seed Script

```bash
npm run seed:learning
```

Or directly with ts-node:

```bash
ts-node src/database/seeds/seed-learning-content.ts
```

### What the Script Does

1. ✅ Connects to your database (uses `.env` configuration)
2. ✅ Checks for existing content (won't duplicate)
3. ✅ Creates all learning content items
4. ✅ Shows progress and summary
5. ✅ Exits cleanly

### Example Output

```
Connecting to database...
Database connected!
Seeding learning content...
✅ Created: "How Mukando Works" (Beginner)
✅ Created: "Building Your First Credit Score" (Beginner)
✅ Created: "Budgeting for Contributions" (Beginner)
...
✨ Learning content seeding completed!
📊 Total items: 15

📈 Breakdown by level:
   Beginner (0-299): 4 items
   Growing (300-499): 4 items
   Established (500-699): 4 items
   Trusted (700+): 3 items
```

---

## Verifying Content

### Get All Content

```bash
GET http://localhost:3000/learning/content
Authorization: Bearer YOUR_TOKEN
```

This returns content organized by levels with completion status.

### Get Available Topics

```bash
GET http://localhost:3000/learning/topics
Authorization: Bearer YOUR_TOKEN
```

Returns all unique topics for filtering.

### Filter Content

```bash
# Filter by level
GET http://localhost:3000/learning/content?level=Beginner
Authorization: Bearer YOUR_TOKEN

# Filter by topic
GET http://localhost:3000/learning/content?topic=Mukando%20Basics
Authorization: Bearer YOUR_TOKEN

# Filter by both
GET http://localhost:3000/learning/content?level=Beginner&topic=Mukando%20Basics
Authorization: Bearer YOUR_TOKEN
```

---

## Content Organization

Content is organized by credit score ranges:

| Level | Credit Score Range | Content Count |
|-------|-------------------|---------------|
| **Beginner** | 0-299 | 4 items |
| **Growing** | 300-499 | 4 items |
| **Established** | 500-699 | 4 items |
| **Trusted** | 700+ | 3 items |

### Status Indicators

- ✅ **Completed** - User has finished this content
- ○ **Available** - Content is unlocked and available
- 🔒 **Locked** - User's credit score is below the minimum required

---

## Troubleshooting

### Error: "Content already exists"
- The seed script skips existing content by title
- To re-seed, delete existing content from database first

### Error: "Cannot connect to database"
- Check your `.env` file has correct database credentials
- Ensure PostgreSQL is running
- Verify database name exists

### Error: "Unauthorized"
- Make sure you're using a valid JWT token
- Token might have expired - login again
- Check that the endpoint requires authentication

### Content not showing up
- Verify the content was created: Check database directly
- Ensure you're filtering correctly
- Check that user has required credit score for locked content

---

## Database Schema

The `learning_content` table has the following structure:

```sql
- id (UUID, Primary Key)
- title (string)
- description (string, nullable)
- type (enum: VIDEO, ARTICLE, QUIZ)
- pointsReward (integer)
- url (string, nullable)
- level (enum: Beginner, Growing, Established, Trusted)
- topic (string, nullable)
- minCreditScore (integer, default: 0)
- createdAt (timestamp)
- updatedAt (timestamp)
```

---

## Next Steps

After adding content:
1. ✅ Test the content retrieval endpoint
2. ✅ Verify content appears in the correct levels
3. ✅ Test completion flow with a user
4. ✅ Verify credit score locking works
5. ✅ Update frontend to display the content

---

## Need Help?

- Check the API documentation at `/api` (Swagger)
- Review the learning service: `learning/learning.service.ts`
- Check entity definitions: `learning/entities/learning-content.entity.ts`

