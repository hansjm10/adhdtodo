# ADHD Todo App Feature Specifications

## Core Features

### 1. Task Management

#### Task Creation

- **Voice Input**: Speech-to-text with AI parsing
- **Quick Add**: Single tap to create basic task
- **Batch Add**: Multiple tasks from a list
- **Template Tasks**: Save recurring task templates
- **Import Tasks**: From calendar, email, or text

#### Task Properties

```javascript
{
  id: string,
  title: string,
  description?: string,
  subtasks?: Task[],
  energyLevel: 'low' | 'medium' | 'high',
  estimatedTime: number, // minutes
  actualTime?: number,
  category: string,
  tags: string[],
  priority: 1-5,
  dueDate?: Date,
  reminder?: Reminder,
  completed: boolean,
  completedAt?: Date,
  createdAt: Date,
  updatedAt: Date,
  deferCount: number,
  notes?: string,
  mood?: 'excited' | 'neutral' | 'anxious' | 'overwhelmed'
}
```

#### Task Actions

- **Complete**: Swipe right with celebration
- **Defer**: Swipe left with no shame
- **Break Down**: AI-powered subtask generation
- **Reschedule**: Smart time suggestions
- **Convert**: Task to project or vice versa
- **Share**: Send task to accountability partner

### 2. AI Assistant

#### Capabilities

- **Task Breakdown**: Intelligent chunking of large tasks
- **Time Estimation**: Based on historical data
- **Priority Suggestion**: Based on energy, deadline, importance
- **Pattern Recognition**: Identify procrastination patterns
- **Smart Scheduling**: Optimal time slot suggestions
- **Natural Language**: Understand context and intent

#### Implementation

```javascript
// AI Task Breakdown Example
async function breakdownTask(task) {
  const analysis = await AI.analyze({
    title: task.title,
    userHistory: getUserTaskHistory(),
    energyLevel: getCurrentEnergyLevel(),
    timeAvailable: getAvailableTime(),
  });

  return {
    subtasks: analysis.subtasks,
    totalTime: analysis.estimatedTime,
    difficulty: analysis.difficulty,
    startingSuggestion: analysis.firstStep,
  };
}
```

### 3. ADHD Modes

#### Mode Specifications

**Hyperfocus Mode**

- Lock screen to single task
- Disable notifications
- Visual timer with progress
- Automatic break reminders
- Focus sounds/music
- Completion celebration

**Scattered Mode**

- Show only 5-15 minute tasks
- Quick win focused
- Rapid task switching
- Minimal details
- High reward frequency

**Low Energy Mode**

- Filter to easy tasks only
- Comfort tasks highlighted
- Self-care reminders
- No deadlines shown
- Gentle interface

**Crisis Mode**

- Critical tasks only
- Simplified interface
- No distractions
- Direct action buttons
- Emergency contact option

**Body Doubling Mode**

- Virtual co-working room
- Shared focus timers
- Anonymous presence
- Activity indicators
- Break synchronization

### 4. Reward System

#### XP System

- Task completion: 10-50 XP based on difficulty
- Streak bonus: 5 XP per day
- Perfect day: 100 XP bonus
- Level progression: Exponential curve
- Prestige system: After level 50

#### Achievements

```javascript
const achievements = [
  { id: 'first_task', name: 'First Step', icon: '👶', xp: 50 },
  { id: 'week_warrior', name: 'Week Warrior', icon: '⚔️', xp: 200 },
  { id: 'hyperfocus_hero', name: 'Hyperfocus Hero', icon: '🦸', xp: 300 },
  { id: 'comeback_kid', name: 'Comeback Kid', icon: '💪', xp: 250 },
  { id: 'energy_master', name: 'Energy Master', icon: '🔋', xp: 400 },
];
```

#### Unlockables

- Themes (10 levels each)
- Sound packs (5 levels each)
- Celebration animations
- Avatar customizations
- Power-ups and boosts

### 5. Time Management

#### Visual Timers

- Circular progress
- Growing plants
- Filling containers
- Racing elements
- Melting ice

#### Time Tracking

- Automatic time logging
- Comparison with estimates
- Time blindness insights
- Daily/weekly summaries
- Pattern identification

#### Smart Reminders

```javascript
const reminderEscalation = [
  { time: -30, type: 'gentle', message: 'Coming up in 30 min' },
  { time: -10, type: 'prepare', message: 'Time to wrap up' },
  { time: 0, type: 'start', message: 'Time to start!' },
  { time: 5, type: 'nudge', message: 'Ready when you are' },
  { time: 15, type: 'check', message: 'Everything okay?' },
];
```

### 6. Organization System

#### Categories

- Customizable with emojis
- Color coding
- Quick filters
- Smart sorting
- Usage analytics

#### Views

- **Today View**: Current focus
- **Week View**: Planning ahead
- **Project View**: Grouped tasks
- **Energy View**: By energy level
- **Quick Wins**: 5-15 min tasks
- **Someday**: No pressure list

#### Search and Filter

- Full text search
- Tag filtering
- Date ranges
- Energy levels
- Completion status
- Smart suggestions

### 7. Data and Insights

#### Analytics Dashboard

- Completion rates
- Energy patterns
- Time accuracy
- Streak history
- Category breakdown
- Productivity trends

#### Insights Engine

```javascript
const insights = {
  bestTimeOfDay: analyzeCompletionsByHour(),
  energyPatterns: analyzeEnergyLevels(),
  taskTypeSuccess: analyzeByCategory(),
  accuracyImprovement: compareEstimatesVsActual(),
  streakPrediction: predictNextBreak(),
  recommendations: generatePersonalizedTips(),
};
```

### 8. Accessibility Features

#### Visual

- High contrast modes
- Font size adjustment
- Dyslexia fonts
- Color blind modes
- Reduced motion option

#### Audio

- Screen reader support
- Voice commands
- Audio feedback
- Notification sounds
- Voice notes

#### Motor

- Large tap targets
- Gesture alternatives
- Simplified navigation
- One-handed mode
- External keyboard

### 9. Privacy and Security

#### Data Protection

- End-to-end encryption
- Local-first storage
- Selective cloud sync
- Data export options
- Account deletion

#### Privacy Settings

```javascript
const privacyOptions = {
  analytics: 'anonymous' | 'detailed' | 'none',
  cloudSync: 'encrypted' | 'none',
  sharing: 'enabled' | 'disabled',
  aiProcessing: 'cloud' | 'local' | 'none',
  backups: 'auto' | 'manual' | 'none',
};
```

### 10. Integration Features

#### Calendar Sync

- Google Calendar
- Apple Calendar
- Outlook
- Bi-directional sync
- Smart conflict resolution

#### Voice Assistants

- Siri Shortcuts
- Google Assistant
- Alexa Skills
- Custom commands

#### Automation

- IFTTT recipes
- Zapier integration
- Webhooks API
- Custom triggers

#### Health Integration

- Apple Health
- Google Fit
- Mood tracking
- Sleep correlation
- Medication reminders

## Technical Specifications

### Performance Requirements

- App launch: <2 seconds
- Task creation: <100ms
- Sync time: <5 seconds
- Offline capability: 100%
- Battery efficient

### Platform Support

- iOS 14+
- Android 8+
- Web (Progressive Web App)
- Apple Watch
- Wear OS

### API Specifications

```javascript
// REST API Endpoints
POST   /api/tasks
GET    /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/:id/complete
POST   /api/tasks/:id/defer
POST   /api/ai/breakdown
GET    /api/insights
GET    /api/achievements
POST   /api/sync
```

### Data Models

```javascript
// User Model
{
  id: string,
  email: string,
  preferences: UserPreferences,
  subscription: SubscriptionStatus,
  achievements: Achievement[],
  stats: UserStatistics,
  createdAt: Date
}

// UserPreferences Model
{
  theme: string,
  sounds: boolean,
  vibrations: boolean,
  notifications: NotificationSettings,
  defaultMode: ADHDMode,
  energyTracking: boolean,
  aiAssistance: boolean
}
```

## Implementation Phases

### Phase 1 - MVP (Months 1-2)

- Basic task CRUD
- Simple categories
- Hyperfocus mode
- Basic rewards
- Local storage

### Phase 2 - Core Features (Months 3-4)

- AI task breakdown
- All ADHD modes
- Cloud sync
- Achievements
- Time tracking

### Phase 3 - Advanced (Months 5-6)

- Full AI assistant
- Analytics dashboard
- Integrations
- Premium features
- Community features

### Phase 4 - Polish (Month 7)

- Performance optimization
- Accessibility audit
- Security review
- Beta testing
- Launch preparation
