import { moment } from "obsidian";
import { NotificationTask, ActiveNotification, ReminderOffset } from "./types";
import { NotificationSettings } from "./settings";

export class NotificationMatcher {
  private settings: NotificationSettings;

  constructor(settings: NotificationSettings) {
    this.settings = settings;
  }

  /**
   * Get all active notifications for a given date
   */
  getActiveNotifications(
    tasks: NotificationTask[],
    referenceDate: string,
  ): ActiveNotification[] {
    const active: ActiveNotification[] = [];
    const today = moment(referenceDate);

    for (const task of tasks) {
      const eventDate = moment(task.eventDate);

      // Check 1: Does the event date match (with repeat and lookback logic)?
      if (this.eventDateMatches(eventDate, today, task.repeatInterval)) {
        // For yearly events, calculate diff from this year's occurrence
        let effectiveEventDate = eventDate;
        if (task.repeatInterval === "year") {
          effectiveEventDate = eventDate.clone().year(today.year());
        }

        const daysDiff = today.diff(effectiveEventDate, "days");
        const context = this.getEventDateContext(daysDiff, task.repeatInterval);

        active.push({
          task,
          reminderOffset: null, // null means event day itself
          displayText: `${task.title} 📆 ${task.eventDate} — *${context}*`,
        });
      }

      // Check 2: Do any reminder offsets match?
      for (const offset of task.reminderOffsets) {
        const reminderDate = this.calculateReminderDate(
          eventDate,
          offset,
          task.repeatInterval,
          today,
        );

        if (reminderDate && reminderDate.isSame(today, "day")) {
          const unit = offset.number === 1 ? offset.unit : `${offset.unit}s`;
          active.push({
            task,
            reminderOffset: offset,
            displayText: `${task.title} 📆 ${task.eventDate} — *${offset.number} ${unit} early*`,
          });
        }
      }
    }

    return active;
  }

  /**
   * Check if an event date matches today, considering repeat intervals and lookback
   */
  private eventDateMatches(
    eventDate: moment.Moment,
    today: moment.Moment,
    repeatInterval: "day" | "week" | "month" | "year" | null,
  ): boolean {
    switch (repeatInterval) {
      case null: {
        // One-time event: exact match with lookback window
        const daysDiff = today.diff(eventDate, "days");
        return daysDiff >= 0 && daysDiff <= this.settings.lookbackDays;
      }

      case "year": {
        // Yearly event: match month+day, with lookback for this year's occurrence
        const thisYearEvent = eventDate.clone().year(today.year());
        const yearDiff = today.diff(thisYearEvent, "days");

        // Within lookback window for this year's occurrence (includes exact match when yearDiff === 0)
        return yearDiff >= 0 && yearDiff <= this.settings.lookbackDays;
      }

      case "month": {
        // Monthly event: match day of month (exact, no lookback)
        return eventDate.date() === today.date();
      }

      case "week": {
        // Weekly event: match day of week (exact, no lookback)
        return eventDate.day() === today.day();
      }

      case "day": {
        // Daily event: matches every day
        return true;
      }

      default:
        return false;
    }
  }

  /**
   * Calculate the reminder date for a given offset
   */
  private calculateReminderDate(
    eventDate: moment.Moment,
    offset: ReminderOffset,
    repeatInterval: "day" | "week" | "month" | "year" | null,
    today: moment.Moment,
  ): moment.Moment | null {
    let targetEvent = eventDate.clone();

    // For repeating events, find the next occurrence from today
    switch (repeatInterval) {
      case "year": {
        // Adjust to current/next year
        targetEvent.year(today.year());
        if (targetEvent.isBefore(today, "day")) {
          targetEvent.add(1, "year");
        }
        break;
      }

      case "month": {
        // Adjust to current/next month
        targetEvent.month(today.month()).year(today.year());
        if (targetEvent.isBefore(today, "day")) {
          targetEvent.add(1, "month");
        }
        break;
      }

      case "week": {
        // Find next occurrence of this day of week
        const dayOfWeek = eventDate.day();
        const todayDayOfWeek = today.day();

        targetEvent = today.clone().day(dayOfWeek);
        if (dayOfWeek <= todayDayOfWeek) {
          targetEvent.add(1, "week");
        }
        break;
      }

      case "day": {
        // Daily events: reminder is offset from today
        targetEvent = today.clone();
        break;
      }

      case null: {
        // One-time event: use the event date as-is
        break;
      }
    }

    // Subtract the reminder offset from the target event
    const reminderDate = targetEvent.subtract(offset.number, offset.unit);

    return reminderDate;
  }

  /**
   * Get display context for event date matches
   */
  private getEventDateContext(
    daysDiff: number,
    repeatInterval: "day" | "week" | "month" | "year" | null,
  ): string {
    if (daysDiff === 0) {
      return "today";
    } else if (daysDiff > 0) {
      // Event was in the past
      return `${daysDiff} day${daysDiff === 1 ? "" : "s"} ago`;
    } else {
      // Event is in the future (shouldn't happen with our matching logic, but handle it)
      return `in ${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? "" : "s"}`;
    }
  }
}
