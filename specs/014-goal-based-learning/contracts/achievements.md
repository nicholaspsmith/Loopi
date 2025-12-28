# API Contract: Achievements & Titles

**Base Path**: `/api/achievements`

## Endpoints

### Get User Achievements

```
GET /api/achievements
```

**Response**: `200 OK`

```typescript
{
  achievements: {
    key: string
    title: string
    description: string
    icon: string
    unlockedAt: string
    metadata: Record<string, unknown> | null
  }[]
  totalUnlocked: number
  totalAvailable: number
  currentTitle: {
    title: string
    earnedAt: string
  }
  nextTitle: {
    title: string
    requirement: string
    progress: number      // 0-100
  } | null
}
```

---

### Get Achievement Definitions

```
GET /api/achievements/definitions
```

**Response**: `200 OK`

```typescript
{
  achievements: AchievementDefinition[]
  titles: TitleDefinition[]
}
```

**Notes**:

- Returns all possible achievements with unlock conditions
- Useful for displaying locked achievements with requirements

---

### Check Achievements (Internal)

Called automatically after study session completion.

```
POST /api/achievements/check
```

**Request Body**:

```typescript
{
  trigger: 'session_complete' | 'goal_progress' | 'daily_check'
  context: {
    goalId?: string
    sessionId?: string
    ratings?: number[]
    timedScore?: number
  }
}
```

**Response**: `200 OK`

```typescript
{
  newlyUnlocked: UnlockedAchievement[]
  titleChanged: {
    oldTitle: string
    newTitle: string
  } | null
}
```

---

## Types

### AchievementDefinition

```typescript
interface AchievementDefinition {
  key: string
  title: string
  description: string
  icon: string
  category: 'mastery' | 'progress' | 'performance' | 'consistency'
  requirement: string // Human-readable requirement
  checkLogic: string // For documentation: "totalCardsMastered >= 10"
}
```

### TitleDefinition

```typescript
interface TitleDefinition {
  title: string
  rank: number // 1 = lowest
  requirement: string // Human-readable
  cardThreshold?: number
  goalThreshold?: number
}
```

### UnlockedAchievement

```typescript
interface UnlockedAchievement {
  key: string
  title: string
  description: string
  icon: string
  unlockedAt: string
  metadata?: Record<string, unknown>
}
```

---

## Definition: Mastered Card

A card is considered "mastered" when its FSRS state meets these criteria:

- **State** = `Review` (not New, Learning, or Relearning)
- **Stability** > 21 days (retained for 3+ weeks without lapse)

This definition is used for:

- Achievement unlock conditions (`first_10_cards`, `first_50_cards`, etc.)
- Title ladder progression (total cards mastered counts)
- Goal mastery percentage calculation

---

## Achievement Definitions

### Mastery Achievements

| Key               | Title           | Description                | Requirement               |
| ----------------- | --------------- | -------------------------- | ------------------------- |
| `first_10_cards`  | First Steps     | Master your first 10 cards | 10 cards in Review state  |
| `first_50_cards`  | Getting Started | Master 50 cards            | 50 cards in Review state  |
| `first_100_cards` | Century         | Master 100 cards           | 100 cards in Review state |
| `first_500_cards` | Memory Master   | Master 500 cards           | 500 cards in Review state |

### Progress Achievements

| Key               | Title           | Description                 | Requirement     |
| ----------------- | --------------- | --------------------------- | --------------- |
| `goal_25_percent` | Making Progress | Reach 25% mastery on a goal | Any goal >= 25% |
| `goal_50_percent` | Halfway There   | Reach 50% mastery on a goal | Any goal >= 50% |
| `goal_75_percent` | Almost There    | Reach 75% mastery on a goal | Any goal >= 75% |
| `goal_complete`   | Goal Achieved   | Complete a learning goal    | Any goal = 100% |
| `five_goals`      | Goal Setter     | Complete 5 learning goals   | 5 goals at 100% |

### Performance Achievements

| Key               | Title           | Description                    | Requirement                     |
| ----------------- | --------------- | ------------------------------ | ------------------------------- |
| `perfect_session` | Perfect Session | All Good or Easy in a session  | Min 10 cards, all ratings >= 3  |
| `speed_demon`     | Speed Demon     | Score 90%+ in timed challenge  | Timed mode, score >= 90%        |
| `accuracy_master` | Accuracy Master | 95% retention over 100 reviews | retentionRate >= 95% after 100+ |

### Consistency Achievements

| Key            | Title        | Description              | Requirement                                 |
| -------------- | ------------ | ------------------------ | ------------------------------------------- |
| `week_warrior` | Week Warrior | Study 7 days in any week | 7 days with reviews in rolling 7-day window |
| `month_master` | Month Master | Study 20 days in a month | 20 days in any 30-day window                |

**Note**: These are NOT streaks. They are retroactive and don't require consecutive days.

---

## Title Ladder

| Rank | Title        | Requirement                                |
| ---- | ------------ | ------------------------------------------ |
| 1    | Novice       | Default                                    |
| 2    | Apprentice   | 25 cards mastered                          |
| 3    | Practitioner | 100 cards mastered                         |
| 4    | Specialist   | 250 cards mastered                         |
| 5    | Expert       | 500 cards mastered                         |
| 6    | Master       | 1000 cards mastered OR 5 goals completed   |
| 7    | Grandmaster  | 2000 cards mastered AND 10 goals completed |

---

## Achievement Check Logic

Achievements are checked at these trigger points:

### After Session Complete

```typescript
async function checkSessionAchievements(userId: string, session: SessionResult) {
  const checks = [
    checkCardMasteryAchievements(userId),
    checkPerfectSession(userId, session.ratings),
    checkSpeedDemon(userId, session.timedScore),
  ]
  return Promise.all(checks)
}
```

### After Goal Progress Update

```typescript
async function checkGoalAchievements(userId: string, goalId: string) {
  const goal = await getGoal(goalId)
  const checks = [
    checkGoalProgressAchievements(userId, goal.masteryPercentage),
    checkGoalCompletionAchievements(userId),
  ]
  return Promise.all(checks)
}
```

### Daily Cron (Consistency)

```typescript
async function checkConsistencyAchievements(userId: string) {
  const studyDays = await getStudyDaysInWindow(userId, 30)
  return [checkWeekWarrior(userId, studyDays), checkMonthMaster(userId, studyDays)]
}
```

---

## Celebration UI

When achievements unlock, the API returns them immediately. Frontend shows:

1. **Toast notification** with achievement icon and title
2. **Confetti animation** (canvas-confetti)
3. **Title upgrade banner** if title changed

Celebration is non-blocking - user can continue studying.
