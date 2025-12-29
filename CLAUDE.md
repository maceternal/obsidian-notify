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

1. **Event matching**: Shows notification if today matches the event date (month + day, ignoring year) or within configurable lookback window (default: 3 days for weekend events)
2. **Reminder matching**: Shows notification if today matches a calculated reminder offset (e.g., "2 weeks before event date")
3. **Multiple reminders**: A single task can have multiple numbered emoji reminders
4. **Acknowledgement**: Checked notifications don't reappear until next reminder trigger date

## Architecture

### Module Structure

The plugin is organized into 11 focused modules, grouped by architectural concern:

#### Core Logic Modules

- **`types.ts`** - TypeScript interfaces defining core data structures:
  - `ReminderOffset` - Structured reminder data (number + unit)
  - `NotificationTask` - Parsed task with source location, event date, and reminders
  - `ActiveNotification` - Task that should display today with computed display text
  - `NotificationAcknowledgements` - Acknowledgement tracking data structure

- **`parser.ts`** - Task parsing utilities (`TaskParser` class):
  - Emoji detection and extraction (dates, repeat intervals, reminder offsets)
  - Title extraction (everything before `📆`)
  - Block ID extraction and generation
  - Date extraction from filenames (e.g., `2026-01-07.md` → `2026-01-07`)
  - Pure functions with no state - easy to test

- **`cache.ts`** - Event-driven caching system (`NotificationCache` class):
  - Maintains `Map<filePath, NotificationTask[]>` of all notification tasks
  - Integrates with Obsidian's `MetadataCache` events (no polling)
  - Updates incrementally on file changes (modify, create, delete, rename)
  - Provides `getAllTasks()` for matcher consumption
  - Singleton pattern - one cache instance per plugin

- **`matcher.ts`** - Core notification matching algorithm (`NotificationMatcher` class):
  - Contains the business logic for determining which notifications show today
  - `getActiveNotifications(tasks, referenceDate)` - main entry point returning `ActiveNotification[]`
  - Two-phase matching: (1) event date matches, (2) reminder offset matches
  - Event date matching handles 5 repeat interval types: `null` (one-time), `day`, `week`, `month`, `year`
  - Lookback window applies to one-time and yearly events to catch weekend events
  - Reminder calculation: finds next occurrence of repeating event, then subtracts offset
  - Supports multiple reminders per task (1️⃣, 2️⃣, 3️⃣, etc.)
  - Returns `ActiveNotification[]` with computed display text for each match
  - Pure logic with no state or side effects - easy to test independently
  - Context generation for display: "today", "2 days ago", "1 week early", etc.
  - Proper pluralization: "1 week" vs "2 weeks early"

#### UI Components

- **`renderer.ts`** - Code block rendering (`NotifyBlockRenderer` class):
  - Renders ` ```notify``` ` code blocks in reading view
  - Context-aware date detection: extracts date from filename when available
  - Falls back to system date if no file date found
  - Takes settings and logger as constructor parameters (explicit dependencies)
  - Extends `MarkdownRenderChild` for proper Obsidian lifecycle management
  - Smart refresh: hash-based change detection prevents unnecessary re-renders
  - Only re-renders when active notifications actually change (performance optimization)
  - Registers/unregisters with plugin on load/unload for coordinated updates
  - Renders markdown links with block IDs: `[[File#^blockid|Title]]`
  - Creates interactive checkboxes for acknowledgement tracking
  - Listens to checkbox change events and updates plugin acknowledgement state
  - Visual styling: strikethrough for past event dates (`~~date~~`)
  - Handles empty state gracefully ("No notifications for today")

- **`debug-modal.ts`** - Debug UI (`NotificationDebugModal` class):
  - Modal displaying all notification tasks in the vault
  - Accessed via command palette: "Show notification tasks (debug)"
  - Groups tasks by file with task count summary
  - Clickable file headers and task items for instant navigation to source
  - Displays comprehensive task metadata: title, event date, repeat interval, reminders, block ID, line number
  - Useful for troubleshooting parsing issues and cache state

#### Infrastructure

- **`events.ts`** - Vault event management (`EventManager` class):
  - Manages all Obsidian vault event listeners for the plugin
  - Listens to three event types: metadata changed, file deleted, file renamed
  - Debouncing: 500ms delay on file changes to batch rapid edits
  - Delegates to cache for actual updates (`updateFile`, `removeFile`)
  - Cleanup: clears debounce timers and removes event refs on plugin unload
  - Prevents cache thrashing during active typing/editing

- **`blockid-manager.ts`** - Auto block ID generation (`BlockIdManager` class):
  - Automatically generates block IDs for notification tasks that lack them
  - Queuing: collects tasks during initial vault scan
  - Batching: groups tasks by file for efficient `vault.process()` usage
  - Uses `vault.process()` for atomic file modification
  - Safety check: verifies original line hasn't changed before adding block ID
  - Generates random 6-character block IDs (e.g., `^abc123`)

- **`logger.ts`** - Debug logging (`Logger` class):
  - Configurable debug logging infrastructure
  - Methods: `debug()`, `warn()`, `error()`
  - Debug output controlled by `settings.debugLogging` toggle
  - Warnings and errors always shown regardless of debug setting

#### Plugin Lifecycle

- **`main.ts`** - Plugin entry point (`NotificationPlugin`):
  - Extends Obsidian's `Plugin` class
  - Registers `NotifyBlockRenderer` for ` ```notify``` ` code blocks
  - Manages cache lifecycle and coordinates all manager instances
  - Maintains renderer registry for coordinated refresh on cache updates
  - Handles acknowledgement storage in plugin data file
  - Provides debug command: "Show notification tasks (debug)"

- **`settings.ts`** - Plugin settings:
  - `lookbackDays` - How many days in the past to check for events (default: 3)
  - `useFileDate` - Extract date from filename for context-aware notifications (default: true)
  - `debugLogging` - Enable verbose console logging (default: false)
  - `acknowledgements` - Map of acknowledged notifications with dates
  - Settings UI using Obsidian's `PluginSettingTab`

### Key Architectural Decisions

1. **Code blocks instead of injection**: Uses ` ```notify``` ` blocks (like Dataview) rather than automatically injecting into daily notes. This gives users control over placement.

2. **Event-driven cache**: Listens to Obsidian's file events rather than polling. Cache updates only when files change.

3. **Block ID linking**: Auto-generates block IDs (`^abc123`) if tasks don't have them, enabling `[[File#^blockid|Title]]` links back to source.

4. **Acknowledgement via checkboxes**: Generated tasks have checkboxes. Renderer filters out checked notifications until next trigger date.

5. **Date matching with lookback**: Configurable lookback window catches events that happened over the weekend.

6. **Separation of matcher and renderer**: Matcher contains pure business logic (date calculations, repeat interval handling) while renderer handles UI and Obsidian integration. This enables testing matcher logic independently of the Obsidian API.

7. **Event manager with debouncing**: 500ms debounce on file change events prevents cache updates during rapid typing. Timers are cleared on file delete/rename to prevent stale updates. Centralizes event handling rather than spreading it across modules.

8. **Block ID manager batching**: Queues tasks during initial vault scan and groups by file to minimize `vault.process()` calls. Verifies line content hasn't changed before modification for safety.

9. **Smart refresh with hash-based change detection**: Renderer creates a hash of current active notifications and only re-renders when the hash changes. Prevents flickering and unnecessary DOM manipulation.

10. **Context-aware date extraction**: Renderer can extract dates from filenames (e.g., `2026-01-07.md`) to show notifications relevant to that date instead of always using today's date. Enabled by default with user toggle in settings. Falls back gracefully to system date when no file date is found.

## Styling System

The plugin includes custom CSS styling in `styles.css` to enhance the notification display:

- **`.notification-block`** - Container styling for notify code blocks
- **`.notification-empty`** - Styling for empty state message
- **`.notification-loading`** - Styling for loading state
- **`.task-list-item.acknowledged`** - Checked notification styling with visual distinction
- **`.notification-debug-modal`** - Debug modal UI styling
- **Strikethrough for past events** - Past event dates use markdown strikethrough (`~~date~~`) for visual indication

The styling integrates seamlessly with Obsidian's theme system while providing clear visual feedback for notification states.

## CI/CD Pipeline

The project includes automated workflows in `.github/workflows/`:

- **`release-pr.yml`** - Automated release PR creation workflow
  - Triggered by version bumps via `npm version` commands
  - Creates release pull requests with changelog

- **`lint.yml`** - Continuous integration linting
  - Runs on push and pull requests
  - Executes `npm run lint` to catch code quality issues

- **`publish-release.yml`** - Publication workflow
  - Triggered when releases are created
  - Automates plugin publication process

## Data Persistence

The plugin stores runtime data in `data.json` in the plugin's data directory:

- **Acknowledgements** - Stored as key-value pairs: `{ "filepath:line:offset": "YYYY-MM-DD" }`
  - Key format: `filePath:lineNumber:offset` (e.g., `"notes/tasks.md:42:1-week"`)
  - Value: Date when notification was acknowledged
  - Acknowledgements expire when the notification's trigger date changes
  - Checked notifications don't reappear until the next occurrence

The acknowledgement system allows users to dismiss notifications they've seen while ensuring they reappear for future occurrences of repeating events.

## Module Dependencies

The module dependency structure showing how components interact:

```
main.ts (plugin entry)
  ├── settings.ts (configuration)
  ├── logger.ts (logging)
  ├── cache.ts (task storage)
  │   ├── parser.ts (task parsing)
  │   ├── blockid-manager.ts (auto block IDs)
  │   └── types.ts (data structures)
  ├── events.ts (vault event handling)
  │   └── cache.ts (triggers updates)
  ├── renderer.ts (notify block UI)
  │   ├── matcher.ts (notification logic)
  │   ├── settings.ts (config)
  │   └── types.ts (data structures)
  └── debug-modal.ts (debug UI)
      └── types.ts (data structures)
```

**Key dependency patterns:**
- `types.ts` is imported by most modules (shared data structures)
- `cache.ts` depends on `parser.ts` and `blockid-manager.ts` for processing
- `renderer.ts` depends on `matcher.ts` for business logic separation
- `events.ts` orchestrates cache updates based on vault changes
- `main.ts` coordinates all managers and owns the plugin lifecycle

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
