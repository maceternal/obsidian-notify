# Obsidian Notify

An Obsidian plugin for managing event notifications and reminders using an emoji-based task syntax.

## Features

- 📆 Track events and anniversaries with dates
- 🔔 Set up recurring notifications (daily, weekly, monthly, yearly)
- Create multiple reminder offsets (e.g., remind 2 weeks before, 1 week before)
- Acknowledge notifications with checkboxes
- Clickable links back to original task definitions
- Debug view to see all notification tasks across your vault

## How to Use

### Basic Syntax

Create tasks with emoji markers to define notifications:

- `📆` - Date of event (format: YYYY-MM-DD)
- `🔔` - Marks a task as a reminder/notification
- `🔁` - Repeat interval (day, week, month, year)
- `1️⃣`, `2️⃣`, `3️⃣`, etc. - Reminder offsets (e.g., "2️⃣ week" = remind 2 weeks before event)

### Example Tasks

**One-time event:**

```markdown
- [ ] Created Notify Plugin 📆 2025-12-23 🔔 ^abc123
```

**Yearly recurring event:**

```markdown
- [ ] Project Launch Anniversary 📆 2024-03-15 🔁 year 🔔 ^def456
```

**Event with multiple reminders:**

```markdown
- [ ] Annual Review 📆 2025-06-01 🔁 year 4️⃣ week 2️⃣ week 🔔 ^ghi789
```

This creates reminders 4 weeks and 2 weeks before June 1st, repeating yearly.

### Displaying Notifications

Add a `notify` code block to any note (typically your daily note):

````markdown
```notify

```
````

This will display:

- Events happening today (or within the lookback window for past events)
- Reminder notifications for upcoming events
- Checkboxes to acknowledge each notification

### Acknowledgement

- Check the box next to a notification to acknowledge it
- Acknowledged notifications won't reappear until the next reminder date
- Uncheck to see it again

### Block IDs

Tasks need block IDs (the `^abc123` part) to create clickable links. If you don't add one, the plugin will automatically generate it and add one for you.

## Settings

**Lookback Days** (default: 3)

- How many days in the past to check for events
- Useful for catching events that happened over the weekend

## Commands

**Show all notification tasks**

- Opens a debug modal showing all notification tasks across your vault
- Displays event dates, repeat intervals, and reminder offsets
- Click any task to navigate to its source location

## Installation

### From Community Plugins (once published)

1. Open Obsidian Settings
2. Go to **Community plugins** → **Browse**
3. Search for "Notify"
4. Click **Install**, then **Enable**

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run dev    # Watch mode - rebuilds on file changes
npm run build  # Production build
```

### Lint

```bash
npm run lint
```

### Version Bump

```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

## License

0-BSD

## Support

If you encounter issues or have feature requests, please [open an issue](https://github.com/maceternal/obsidian-notify/issues).
