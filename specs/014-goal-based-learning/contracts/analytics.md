# API Contract: Analytics

**Base Path**: `/api/analytics`

## Endpoints

### Get Dashboard Stats

```
GET /api/analytics/dashboard
```

**Response**: `200 OK`

```typescript
{
  overview: {
    activeGoals: number
    completedGoals: number
    totalCards: number
    cardsDueToday: number
    cardsDueThisWeek: number
    overallRetention: number // 0-100
    totalTimeHours: number
  }
  currentTitle: {
    title: string
    nextTitle: string | null
    progressToNext: number // 0-100
  }
  recentActivity: {
    date: string // YYYY-MM-DD
    cardsStudied: number
    minutesSpent: number
  }
  ;[] // Last 7 days
  upcomingReviews: {
    date: string
    cardCount: number
  }
  ;[] // Next 7 days
}
```

---

### Get Goal Analytics

```
GET /api/analytics/goals/[goalId]
```

**Response**: `200 OK`

```typescript
{
  goalId: string
  title: string
  masteryPercentage: number
  masteryByNode: {
    nodeId: string
    nodeTitle: string
    depth: number
    mastery: number
    cardCount: number
    cardsdue: number
  }
  ;[]
  studyHistory: {
    date: string
    cardsStudied: number
    averageRating: number
  }
  ;[] // Last 30 days
  retentionCurve: {
    daysAgo: number
    retention: number
  }
  ;[] // Retention over time
  timeInvested: {
    totalMinutes: number
    byMode: {
      flashcard: number
      multipleChoice: number
      timed: number
    }
  }
  predictions: {
    estimatedCompletionDate: string | null
    cardsDueNextWeek: number
    projectedMasteryIn30Days: number
  }
}
```

---

### Get Topic Trends (Admin)

```
GET /api/analytics/topics
```

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 20 | Max results |
| hasCurated | boolean | - | Filter by curated tree status |

**Response**: `200 OK`

```typescript
{
  topics: {
    normalizedTopic: string
    originalExamples: string[]
    userCount: number
    goalCount: number
    firstSeenAt: string
    lastSeenAt: string
    hasCuratedTree: boolean
  }[]
  total: number
}
```

**Use Case**: Identify high-demand topics for curated tree creation

---

### Record Topic (Internal)

Called when a new goal is created.

```
POST /api/analytics/topics/record
```

**Request Body**:

```typescript
{
  originalTopic: string // User's original input
}
```

**Response**: `200 OK`

```typescript
{
  normalizedTopic: string
  isNew: boolean
  currentUserCount: number
}
```

**Notes**:

- Normalizes topic using rules from research.md
- Upserts into topicAnalytics table
- Increments counters

---

## Types

### RetentionData

```typescript
interface RetentionData {
  totalReviews: number
  correctReviews: number // rating >= 3
  retentionRate: number // 0-100
  byState: {
    New: { total: number; correct: number }
    Learning: { total: number; correct: number }
    Review: { total: number; correct: number }
    Relearning: { total: number; correct: number }
  }
}
```

### StudyPrediction

```typescript
interface StudyPrediction {
  // Based on current pace and FSRS projections
  estimatedCompletionDate: string | null
  cardsDueByDay: { date: string; count: number }[]
  masteryProjection: { date: string; mastery: number }[]
}
```

---

## Dashboard Widgets

### Review Forecast

Shows upcoming reviews for the next 7 days:

```typescript
async function getReviewForecast(userId: string): Promise<ReviewForecast[]> {
  const cards = await getActiveCards(userId)
  const forecast = []

  for (let i = 0; i < 7; i++) {
    const date = addDays(new Date(), i)
    const dueCount = cards.filter((c) => isSameDay(c.fsrsState.due, date)).length
    forecast.push({ date: format(date, 'yyyy-MM-dd'), cardCount: dueCount })
  }

  return forecast
}
```

### Mastery Heatmap

Visual representation of skill tree with mastery levels:

```
 Core Concepts     ████████░░  80%
 ├─ Pods           ██████████  100%
 ├─ Services       ████████░░  80%
 └─ Deployments    ██████░░░░  60%
 Networking        ██████░░░░  60%
 ├─ Ingress        ████░░░░░░  40%
 └─ DNS            ████████░░  80%
```

---

## Topic Normalization

As defined in research.md:

```typescript
function normalizeTopic(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^(learn|study|master|intro to|introduction to)\s+/i, '')
    .replace(/\s+/g, ' ')
}

// Examples:
// "Learn Kubernetes Administration" → "kubernetes administration"
// "PYTHON programming" → "python programming"
// "Intro to Machine Learning" → "machine learning"
```
