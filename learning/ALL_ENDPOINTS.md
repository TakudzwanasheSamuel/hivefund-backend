# All Learning Endpoints

## Overview
This document lists all available learning endpoints, including the 10 recommended topic endpoints and the Q&A endpoint.

---

## 🔹 General Endpoints

### 1. Generate Custom Lesson
**Endpoint:** `POST /learning/generate-lesson`  
**Description:** Generate a lesson on any topic using AI  
**Request Body:**
```json
{
  "topic": "Your Custom Topic",
  "difficultyLevel": "Beginner",  // Optional
  "learningGoals": "What you want to learn"  // Optional
}
```

### 2. Ask a Question
**Endpoint:** `POST /learning/ask-question`  
**Description:** Get AI-powered answers to any question about HiveFund, Mukando, credit, loans, or business  
**Request Body:**
```json
{
  "question": "How do I increase my credit score faster?",
  "context": "I have a credit score of 250"  // Optional
}
```

**Response:**
```json
{
  "question": "How do I increase my credit score faster?",
  "context": "I have a credit score of 250",
  "userCreditScore": 250,
  "userLevel": "Beginner",
  "answer": {
    "answer": "To increase your credit score faster...",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "actionable_steps": ["Step 1", "Step 2"],
    "related_topics": ["Topic 1", "Topic 2"]
  },
  "answered_at": "2024-01-01T00:00:00.000Z"
}
```

---

## 📚 Top 10 Recommended Topic Endpoints

All endpoints are `GET` requests that generate AI-powered lessons. Content is personalized based on your credit score level.

### Beginner Level (0-299 Credit Score)

#### 1. How Mukando Works
**Endpoint:** `GET /learning/topics/how-mukando-works`  
**Description:** Complete guide to Mukando (rotating savings groups) and how HiveFund digitizes them  
**Level:** Beginner  
**Points:** 10

#### 2. Building Your First Credit Score
**Endpoint:** `GET /learning/topics/building-credit-score`  
**Description:** Understand credit scores in HiveFund and learn strategies to build credit quickly  
**Level:** Beginner  
**Points:** 10

#### 3. Budgeting for Contributions
**Endpoint:** `GET /learning/topics/budgeting-contributions`  
**Description:** Master budgeting to ensure consistent circle contributions  
**Level:** Beginner  
**Points:** 15

---

### Growing Level (300-499 Credit Score)

#### 4. Managing Multiple Circles
**Endpoint:** `GET /learning/topics/managing-multiple-circles`  
**Description:** Advanced strategies for participating in multiple savings circles  
**Level:** Growing  
**Points:** 20

#### 5. When to Take Your First Loan
**Endpoint:** `GET /learning/topics/when-to-take-first-loan`  
**Description:** Understand loan eligibility and when borrowing makes sense  
**Level:** Growing  
**Points:** 20

#### 6. Side Hustle Pricing Strategies
**Endpoint:** `GET /learning/topics/side-hustle-pricing`  
**Description:** Learn competitive pricing strategies for the Zimbabwean market  
**Level:** Growing  
**Points:** 25

---

### Established Level (500-699 Credit Score)

#### 7. Loan Repayment Strategies
**Endpoint:** `GET /learning/topics/loan-repayment-strategies`  
**Description:** Master effective loan repayment to build credit and avoid penalties  
**Level:** Established  
**Points:** 30

#### 8. Scaling Your Hustle
**Endpoint:** `GET /learning/topics/scaling-your-hustle`  
**Description:** Learn when and how to scale your business for sustainable growth  
**Level:** Established  
**Points:** 35

---

### Trusted Level (700+ Credit Score)

#### 9. Advanced Investment Strategies
**Endpoint:** `GET /learning/topics/advanced-investment-strategies`  
**Description:** Explore sophisticated investment strategies for long-term wealth building  
**Level:** Trusted  
**Points:** 40

#### 10. Business Growth Planning
**Endpoint:** `GET /learning/topics/business-growth-planning`  
**Description:** Develop comprehensive business growth plans with financial projections  
**Level:** Trusted  
**Points:** 50

---

## 📋 Response Structure

All topic endpoints return the same structure:

```json
{
  "topic": "How Mukando Works: The Complete Guide",
  "difficultyLevel": "Beginner",
  "userCreditScore": 150,
  "lesson": {
    "title": "Understanding Mukando: Your Path to Financial Freedom",
    "overview": "Brief summary...",
    "detailed_content": "Comprehensive teaching content...",
    "examples": [
      "Example 1: A 10-person group...",
      "Example 2: Using your payout..."
    ],
    "steps": [
      "Step 1: Join or create a circle",
      "Step 2: Set your contribution amount"
    ],
    "quiz_questions": [
      {
        "question": "What is the main benefit of Mukando?",
        "answer": "Forced savings and access to lump sums"
      }
    ],
    "summary": "Key takeaways...",
    "real_world_use_case": "Rudo, a university student...",
    "difficulty_level": "Beginner",
    "generated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 🔐 Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📝 Example Usage

### Using cURL

```bash
# Get "How Mukando Works" lesson
curl -X GET http://localhost:3000/learning/topics/how-mukando-works \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Ask a question
curl -X POST http://localhost:3000/learning/ask-question \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How do I join a circle?",
    "context": "I am new to HiveFund"
  }'
```

### Using JavaScript/TypeScript

```typescript
// Get a recommended topic lesson
const response = await fetch('http://localhost:3000/learning/topics/how-mukando-works', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const lesson = await response.json();

// Ask a question
const answer = await fetch('http://localhost:3000/learning/ask-question', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: 'How do I increase my credit score?',
    context: 'I have a credit score of 250'
  })
});
const result = await answer.json();
```

---

## 🎯 Quick Reference

| # | Topic | Endpoint | Level | Points |
|---|-------|----------|-------|--------|
| 1 | How Mukando Works | `/learning/topics/how-mukando-works` | Beginner | 10 |
| 2 | Building Credit Score | `/learning/topics/building-credit-score` | Beginner | 10 |
| 3 | Budgeting Contributions | `/learning/topics/budgeting-contributions` | Beginner | 15 |
| 4 | Managing Multiple Circles | `/learning/topics/managing-multiple-circles` | Growing | 20 |
| 5 | When to Take First Loan | `/learning/topics/when-to-take-first-loan` | Growing | 20 |
| 6 | Side Hustle Pricing | `/learning/topics/side-hustle-pricing` | Growing | 25 |
| 7 | Loan Repayment Strategies | `/learning/topics/loan-repayment-strategies` | Established | 30 |
| 8 | Scaling Your Hustle | `/learning/topics/scaling-your-hustle` | Established | 35 |
| 9 | Advanced Investment | `/learning/topics/advanced-investment-strategies` | Trusted | 40 |
| 10 | Business Growth Planning | `/learning/topics/business-growth-planning` | Trusted | 50 |

---

## 💡 Tips

1. **Personalization:** All lessons are automatically tailored to your credit score level
2. **Fresh Content:** Each request generates new, up-to-date content
3. **Comprehensive:** Every lesson includes examples, steps, quiz questions, and real-world use cases
4. **Q&A:** Use the ask-question endpoint for specific questions not covered in lessons
5. **Swagger UI:** Test all endpoints at `http://localhost:3000/api/docs`

---

## 🔄 Other Available Endpoints

- `GET /learning` - Get all learning content (with filters)
- `GET /learning/topics` - Get available topics with progress
- `GET /learning/topic/:topicName` - Get content for a specific topic
- `GET /learning/progress` - Get user's learning progress
- `POST /learning/content` - Create new learning content
- `POST /learning/complete` - Mark a module as completed

