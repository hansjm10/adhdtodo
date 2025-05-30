# ADHD Todo App Wireframes

## Screen Layouts

### 1. Main Dashboard (Default View)

```
┌─────────────────────────────┐
│  🔥 5 Day Streak!      🎯   │
│  ████████░░ 80 XP today     │
├─────────────────────────────┤
│  Good morning, Hans! 🌞      │
│  Energy: ████████░░ (High)   │
├─────────────────────────────┤
│  ┌─────────────────────┐     │
│  │ 📝 Quick Add Task   │     │
│  └─────────────────────┘     │
├─────────────────────────────┤
│  TODAY'S FOCUS              │
│  ┌─────────────────────┐    │
│  │ 🎯 Write report     │    │
│  │ ⏱️ ~2 hours         │    │
│  │ 🔋 High energy      │    │
│  │ [Start] [Break down]│    │
│  └─────────────────────┘    │
│                             │
│  QUICK WINS (5-15 min)      │
│  ┌─────────────────────┐    │
│  │ ✉️ Reply to emails  │    │
│  │ ⏱️ ~10 min  [Done!] │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ 🧹 Tidy desk       │    │
│  │ ⏱️ ~5 min   [Done!] │    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│ [🏠] [📋] [🎯] [🏆] [⚙️]  │
└─────────────────────────────┘
```

### 2. Task Creation Screen

```
┌─────────────────────────────┐
│ ← Add New Task              │
├─────────────────────────────┤
│                             │
│ What needs doing?           │
│ ┌─────────────────────┐     │
│ │                     │     │
│ │ [Type or speak...]  │     │
│ │                     │     │
│ └─────────────────────┘     │
│                             │
│ 🤖 AI Suggestions:          │
│ This looks like a big task! │
│ Want me to break it down?   │
│ [Yes, please!] [No thanks]  │
│                             │
│ How much energy?            │
│ [😴 Low] [😊 Med] [🚀 High] │
│                             │
│ When?                       │
│ [Today] [Tomorrow] [Someday]│
│                             │
│ Category:                   │
│ [🏠Home] [💼Work] [❤️Self]  │
│ [🎯Goals] [➕Add new]       │
│                             │
│ Time estimate:              │
│ 🕐 [5m] [15m] [30m] [1h]   │
│    [2h] [4h] [Custom]       │
│                             │
│ [Create Task] [Create+Add]  │
└─────────────────────────────┘
```

### 3. Task Breakdown (AI Assistant)

```
┌─────────────────────────────┐
│ ← Breaking Down Task        │
├─────────────────────────────┤
│ "Clean the entire house"    │
│                             │
│ 🤖 I'll help break this     │
│ into manageable chunks:     │
│                             │
│ ┌─────────────────────┐     │
│ │ 1. Kitchen (30 min) │     │
│ │   □ Clear counters  │     │
│ │   □ Load dishwasher │     │
│ │   □ Wipe surfaces   │     │
│ │   □ Take out trash  │     │
│ └─────────────────────┘     │
│ ┌─────────────────────┐     │
│ │ 2. Living Room (20m)│     │
│ │   □ Pick up items   │     │
│ │   □ Vacuum floor    │     │
│ │   □ Dust surfaces   │     │
│ └─────────────────────┘     │
│ ┌─────────────────────┐     │
│ │ 3. Bedroom (15 min) │     │
│ │   □ Make bed        │     │
│ │   □ Sort laundry    │     │
│ │   □ Clear surfaces  │     │
│ └─────────────────────┘     │
│                             │
│ [Use this breakdown]        │
│ [Modify] [Start fresh]      │
└─────────────────────────────┘
```

### 4. Hyperfocus Mode

```
┌─────────────────────────────┐
│      HYPERFOCUS MODE        │
│         🎯 ACTIVE           │
├─────────────────────────────┤
│                             │
│      Write Report           │
│                             │
│    ┌─────────────────┐      │
│    │                 │      │
│    │       25:42     │      │
│    │   ███████████░  │      │
│    │                 │      │
│    └─────────────────┘      │
│                             │
│   🏆 You're crushing it!    │
│                             │
│   Next break in 4 min       │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🔇 Notifications: OFF   │ │
│ │ 🎵 Focus sounds: ON     │ │
│ │ 💧 Water reminder: 15m  │ │
│ └─────────────────────────┘ │
│                             │
│ [Pause] [Complete] [Exit]   │
└─────────────────────────────┘
```

### 5. Rewards & Progress Screen

```
┌─────────────────────────────┐
│ 🏆 Your Progress            │
├─────────────────────────────┤
│ CURRENT STREAK: 🔥 5 days   │
│ ████████████░░░ Level 7     │
│ 1,245 / 1,500 XP           │
├─────────────────────────────┤
│ THIS WEEK'S STATS           │
│ ┌─────────────────────┐     │
│ │ Tasks: 42 ✅ 8 ⏭️    │     │
│ │ Focus time: 12.5 hrs│     │
│ │ Best day: Tuesday   │     │
│ └─────────────────────┘     │
├─────────────────────────────┤
│ ACHIEVEMENTS UNLOCKED       │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐       │
│ │🌟│ │⚡│ │🎯│ │🔥│       │
│ └──┘ └──┘ └──┘ └──┘       │
│ First  Quick  Focus  Week  │
│ Task   5 Done Master Warrior│
├─────────────────────────────┤
│ REWARDS AVAILABLE           │
│ 🎨 New Theme Unlocked!      │
│ 🎵 Focus Sounds Pack        │
│ 🎮 Task RPG Mode           │
│                             │
│ [View All Rewards]          │
└─────────────────────────────┘
```

### 6. Settings & Modes

```
┌─────────────────────────────┐
│ ⚙️ Settings                 │
├─────────────────────────────┤
│ ADHD MODES                  │
│ ┌─────────────────────┐     │
│ │ 🎯 Hyperfocus       │     │
│ │ 🌪️ Scattered        │     │
│ │ 😴 Low Energy       │     │
│ │ 🚨 Crisis Mode      │     │
│ │ 👥 Body Double      │     │
│ └─────────────────────┘     │
├─────────────────────────────┤
│ PREFERENCES                 │
│ Sounds          [ON] 🔊     │
│ Vibrations      [ON] 📳     │
│ Notifications   [SMART] 🔔  │
│ Theme          [Dark] 🌙    │
├─────────────────────────────┤
│ AI ASSISTANT                │
│ Auto-breakdown  [ON] 🤖     │
│ Smart schedule  [ON] 📅     │
│ Energy tracking [ON] 🔋     │
├─────────────────────────────┤
│ ACCOUNT                     │
│ Premium ⭐ Active           │
│ Backup         [ON] ☁️      │
│ Privacy       [View] 🔒     │
└─────────────────────────────┘
```

## Interaction Patterns

### Gestures

- **Swipe right**: Mark task complete
- **Swipe left**: Defer task
- **Long press**: Quick edit
- **Pull down**: Refresh/sync
- **Pinch**: Zoom timeline view

### Quick Actions

- **Shake device**: Random quick task
- **Double tap nav**: Switch modes
- **3D touch**: Peek at task details

### Voice Commands

- "Add task [description]"
- "Start focus mode"
- "What should I do now?"
- "Show me quick wins"
- "I'm feeling low energy"

## Visual Design Elements

### Iconography

- Emoji-first approach for quick recognition
- Custom ADHD-friendly icons
- Energy indicators: 🔋 batteries
- Time indicators: ⏱️ visual timers
- Priority markers: 🎯 targets

### Motion Design

- Celebration confetti for completions
- Smooth sliding transitions
- Bouncy feedback animations
- Progress bar animations
- Streak fire effects 🔥

### Color Coding

- **Red**: Urgent/High Energy
- **Yellow**: Medium priority
- **Green**: Low energy/Easy
- **Blue**: In progress
- **Purple**: Personal/Self-care
- **Gray**: Deferred/Archived

## Responsive Design

### Phone (Portrait)

- Single column layout
- Bottom navigation
- Thumb-friendly zones
- Swipe gestures

### Tablet (Landscape)

- Two-column layout
- Side navigation
- Drag and drop support
- Multi-task view

### Desktop (Web)

- Three-column layout
- Keyboard shortcuts
- Hover states
- Multi-select options
