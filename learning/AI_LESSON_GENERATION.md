# AI-Powered Dynamic Lesson Generation

## Overview

The learning system now uses OpenAI to dynamically generate comprehensive, structured lessons on-demand. Instead of relying on pre-seeded content, each lesson request generates fresh, tailored educational content based on the user's needs and credit score level.

## Endpoint

### POST `/learning/generate-lesson`

Generates a dynamic lesson using OpenAI's GPT-4o-mini model.

**Authentication:** Required (JWT Bearer Token)

**Request Body:**
```json
{
  "topic": "How Mukando Works",
  "difficultyLevel": "Beginner",  // Optional: Beginner, Growing, Established, Trusted
  "learningGoals": "Learn the fundamentals of rotating savings groups"  // Optional
}
```

**Response Structure:**
```json
{
  "topic": "How Mukando Works",
  "difficultyLevel": "Beginner",
  "userCreditScore": 150,
  "lesson": {
    "title": "Understanding Mukando: Your Path to Financial Freedom",
    "overview": "Learn how rotating savings groups work...",
    "detailed_content": "Comprehensive teaching content...",
    "examples": [
      "Example 1: A 10-person group...",
      "Example 2: Using your payout..."
    ],
    "steps": [
      "Step 1: Join or create a circle",
      "Step 2: Set your contribution amount",
      "Step 3: Make consistent payments"
    ],
    "quiz_questions": [
      {
        "question": "What is the main benefit of Mukando?",
        "answer": "Forced savings and access to lump sums"
      }
    ],
    "summary": "Key takeaways from the lesson...",
    "real_world_use_case": "Rudo, a university student, joins a Mukando circle...",
    "difficulty_level": "Beginner",
    "generated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

## Features

1. **Dynamic Content Generation**: Each request generates fresh, up-to-date content
2. **User-Level Adaptation**: Automatically adjusts difficulty based on user's credit score
3. **Comprehensive Structure**: Includes overview, detailed content, examples, steps, quiz questions, and real-world use cases
4. **Culturally Relevant**: Content is tailored for Zimbabwean context and HiveFund platform
5. **Practical Focus**: Emphasizes actionable steps and real-world applications

## How It Works

1. **User Request**: Client sends topic and optional difficulty level
2. **Credit Score Check**: System retrieves user's credit score (if authenticated)
3. **Level Determination**: Maps credit score to appropriate learning level:
   - 0-299: Beginner
   - 300-499: Growing
   - 500-699: Established
   - 700+: Trusted
4. **AI Generation**: OpenAI generates structured lesson content
5. **Response**: Returns formatted JSON with all lesson components

## Configuration

The OpenAI API key must be set in your `.env` file:

```env
OPENAI_API_KEY=sk-proj-your-key-here
```

## Error Handling

- **400 Bad Request**: Invalid request or OpenAI API error
- **401 Unauthorized**: Missing or invalid JWT token
- **500 Internal Server Error**: OpenAI service unavailable or configuration error

## Example Usage

### cURL
```bash
curl -X POST http://localhost:3000/learning/generate-lesson \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Building Your Credit Score",
    "difficultyLevel": "Beginner"
  }'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('http://localhost:3000/learning/generate-lesson', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    topic: 'How Mukando Works',
    difficultyLevel: 'Beginner',
  }),
});

const lesson = await response.json();
console.log(lesson.lesson.title);
console.log(lesson.lesson.detailed_content);
```

## Benefits

1. **No Database Storage Required**: Content is generated on-demand
2. **Always Fresh**: Content reflects latest best practices
3. **Scalable**: Can generate unlimited topics without database constraints
4. **Personalized**: Adapts to user's current credit score level
5. **Comprehensive**: Includes all necessary components for a complete lesson

## Notes

- Content is generated fresh for each request (not cached)
- OpenAI API usage will incur costs based on token usage
- Response time depends on OpenAI API latency (typically 2-5 seconds)
- Content quality depends on the prompt and model used (currently GPT-4o-mini)

