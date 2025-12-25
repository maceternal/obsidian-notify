# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin for managing event notifications and reminders using an emoji-based task syntax. The plugin uses ` ```notify``` ` code blocks (similar to Dataview) to display active notifications, with checkboxes to acknowledge them and clickable links back to the original task definitions.

## Core Concepts

### Emoji Syntax

Tasks use emoji markers to define notifications:
- `📆` - Date of event (format: YYYY-MM-DD)
- `🔔` - Marks a task as a reminder/notification
- `🔁` - Repeat interval (day, week, month, year)
- `1️⃣`, `2️⃣`, `3️⃣`, etc. - Reminder offsets (e.g., "2️⃣ week" = remind 2 weeks before event)

Example task:
```
- [ ] Team Meeting 📆 2025-01-15 🔁 week 1️⃣ day 🔔 ^abc123
```

This creates a reminder 1 day before January 15th, repeating weekly. The `^abc123` is a block ID used for linking.

### Code Block Display

Notifications appear in ` ```notify``` ` code blocks with checkboxes and links back to source:
```
- [ ] [[File#^blockid|Team Meeting]] 📆 *2025-01-15* — *1 day early*
```

Users check the box to acknowledge they've seen the notification. Checked notifications are filtered out until the next reminder date.

### Notification Matching Logic

1. **Event matching**: Shows notification if today matches the event date (month + day, ignoring year) or within configurable lookback window (default: 2 days for weekend events)
2. **Reminder matching**: Shows notification if today matches a calculated reminder offset (e.g., "2 weeks before event date")
3. **Multiple reminders**: A single task can have multiple numbered emoji reminders
4. **Acknowledgement**: Checked notifications don't reappear until next reminder trigger date

## Architecture

### Module Structure

The plugin is organized into focused modules:

- **`types.ts`** - TypeScript interfaces defining core data structures:
  - `ReminderOffset` - Structured reminder data (number + unit)
  - `NotificationTask` - Parsed task with source location, event date, and reminders
  - `ActiveNotification` - Task that should display today with computed display text

- **`parser.ts`** - Task parsing utilities (`TaskParser` class):
  - Emoji detection and extraction (dates, repeat intervals, reminder offsets)
  - Title extraction (everything before `📆`)
  - Block ID extraction and generation
  - Pure functions with no state - easy to test

- **`cache.ts`** - Event-driven caching system (`NotificationCache` class):
  - Maintains `Map<filePath, NotificationTask[]>` of all notification tasks
  - Integrates with Obsidian's `MetadataCache` events (no polling)
  - Updates incrementally on file changes (modify, create, delete, rename)
  - Provides `getAllTasks()` for date matching logic

- **`main.ts`** - Plugin entry point (`NotificationPlugin`):
  - Extends Obsidian's `Plugin` class
  - Registers code block processor for ` ```notify``` ` blocks
  - Manages cache lifecycle and event handlers
  - Commands for testing and manual refresh

- **`settings.ts`** - Plugin settings:
  - `lookbackDays` - How many days in the past to check for events (default: 2)
  - Settings UI using Obsidian's `PluginSettingTab`

### Key Architectural Decisions

1. **Code blocks instead of injection**: Uses ` ```notify``` ` blocks (like Dataview) rather than automatically injecting into daily notes. This gives users control over placement.

2. **Event-driven cache**: Listens to Obsidian's file events rather than polling. Cache updates only when files change.

3. **Block ID linking**: Auto-generates block IDs (`^abc123`) if tasks don't have them, enabling `[[File#^blockid|Title]]` links back to source.

4. **Acknowledgement via checkboxes**: Generated tasks have checkboxes. Code block processor filters out checked notifications until next trigger date.

5. **Date matching with lookback**: Configurable lookback window catches events that happened over the weekend.

## Development Commands

### Initial Setup
```bash
npm install
```

### Build and Development
```bash
npm run dev    # Watch mode - rebuilds on file changes
npm run build  # Production build (runs TypeScript type checking first)
```

The build uses esbuild for fast compilation. Output is `main.js` in the plugin root.

### Linting
```bash
npm run lint   # Check for linting issues using eslint
```

ESLint is configured with `eslint-plugin-obsidianmd` for Obsidian-specific best practices.

### Version Bumping
```bash
npm version patch  # Bump patch version (e.g., 0.1.0 -> 0.1.1)
npm version minor  # Bump minor version (e.g., 0.1.0 -> 0.2.0)
npm version major  # Bump major version (e.g., 0.1.0 -> 1.0.0)
```

This automatically updates `manifest.json`, `package.json`, and `versions.json`.

## Development Workflow

1. **Hot Reload Setup**: The plugin is symlinked to an Obsidian vault with the Hot Reload plugin installed. Changes made during `npm run dev` automatically reload in Obsidian.

2. **TypeScript Configuration**:
   - `baseUrl: "src"` allows clean imports
   - Strict null checks and no implicit any enabled
   - Targets ES6 for broad compatibility

3. **Testing**: Open DevTools in Obsidian (Cmd+Opt+I on Mac) to see console logs and debug.

## Reference Implementation

The design document at `/Users/chrismaki/Documents/Obsidian/ultimate-maki-notes/Notes/My Notification System Design.md` contains DataviewJS query examples demonstrating the core parsing and filtering logic. Use this as reference when implementing date matching and notification filtering.
