# Learning Content API Examples

Quick reference for adding learning content via API.

## Authentication

First, get your JWT token:

```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "phoneNumber": "0771234567",
  "password": "your-password"
}
```

Save the `token` from the response.

---

## Create Content Examples

### Example 1: Beginner Content - Video

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

### Example 2: Growing Content - Article

```bash
POST http://localhost:3000/learning/content
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Managing Multiple Circles",
  "description": "Learn strategies for effectively managing participation in multiple savings circles.",
  "type": "ARTICLE",
  "pointsReward": 20,
  "level": "Growing",
  "topic": "Circle Management",
  "minCreditScore": 300,
  "url": "https://example.com/learning/managing-multiple-circles"
}
```

### Example 3: Established Content - Video

```bash
POST http://localhost:3000/learning/content
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Loan Repayment Strategies",
  "description": "Master effective strategies for repaying loans on time and improving your credit.",
  "type": "VIDEO",
  "pointsReward": 25,
  "level": "Established",
  "topic": "Loans",
  "minCreditScore": 500,
  "url": "https://example.com/learning/loan-repayment-strategies"
}
```

### Example 4: Trusted Content - Locked

```bash
POST http://localhost:3000/learning/content
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Advanced Investment Strategies",
  "description": "Deep dive into advanced investment techniques and portfolio management.",
  "type": "VIDEO",
  "pointsReward": 50,
  "level": "Trusted",
  "topic": "Investments",
  "minCreditScore": 700,
  "url": "https://example.com/learning/advanced-investment-strategies"
}
```

---

## Using cURL

### Create Content

```bash
curl -X POST http://localhost:3000/learning/content \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
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
```

### Get All Content

```bash
curl -X GET http://localhost:3000/learning/content \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Content by Level

```bash
curl -X GET "http://localhost:3000/learning/content?level=Beginner" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Content by Topic

```bash
curl -X GET "http://localhost:3000/learning/content?topic=Mukando%20Basics" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Available Topics

```bash
curl -X GET http://localhost:3000/learning/topics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Using Postman

1. **Set Authorization**: 
   - Type: Bearer Token
   - Token: `YOUR_JWT_TOKEN`

2. **Create Content**:
   - Method: `POST`
   - URL: `http://localhost:3000/learning/content`
   - Body: `raw` → `JSON`
   - Paste the JSON from examples above

3. **Get Content**:
   - Method: `GET`
   - URL: `http://localhost:3000/learning/content`
   - Add query params: `?level=Beginner&topic=Mukando Basics`

---

## Response Examples

### Successful Creation

```json
{
  "id": "uuid-here",
  "title": "How Mukando Works",
  "description": "Learn the fundamentals...",
  "type": "VIDEO",
  "pointsReward": 10,
  "level": "Beginner",
  "topic": "Mukando Basics",
  "minCreditScore": 0,
  "url": "https://example.com/...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Get All Content Response

```json
{
  "levels": [
    {
      "level": "Beginner",
      "label": "Beginner (0-299)",
      "range": { "min": 0, "max": 299 },
      "content": [
        {
          "id": "uuid",
          "title": "How Mukando Works",
          "status": "○",
          "isCompleted": false,
          "isLocked": false,
          "pointsReward": 10,
          "topic": "Mukando Basics"
        }
      ]
    }
  ],
  "userCreditScore": 150
}
```

---

## Content Types

- `VIDEO` - Video content
- `ARTICLE` - Written article
- `QUIZ` - Interactive quiz

## Levels

- `Beginner` - Credit score 0-299
- `Growing` - Credit score 300-499
- `Established` - Credit score 500-699
- `Trusted` - Credit score 700+

---

## Quick Script: Add All Content

Save this as `add-content.sh`:

```bash
#!/bin/bash

TOKEN="YOUR_JWT_TOKEN"
BASE_URL="http://localhost:3000/learning/content"

# Beginner Content
curl -X POST "$BASE_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"How Mukando Works","type":"VIDEO","pointsReward":10,"level":"Beginner","topic":"Mukando Basics","minCreditScore":0}'

# Add more content items...
```

Make it executable: `chmod +x add-content.sh`
Run it: `./add-content.sh`

