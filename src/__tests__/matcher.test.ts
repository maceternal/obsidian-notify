import { describe, it, expect } from "vitest";
import { NotificationMatcher } from "../matcher";
import { NotificationSettings } from "../settings";
import { NotificationTask } from "../types";

const DEFAULT_SETTINGS: NotificationSettings = {
	lookbackDays: 3,
	useFileDate: true,
	debugLogging: false,
	acknowledgements: {},
};

const createTask = (
	overrides: Partial<NotificationTask> = {},
): NotificationTask => ({
	title: "Test Task",
	eventDate: "2025-01-15",
	repeatInterval: null,
	reminderOffsets: [],
	filePath: "test.md",
	lineNumber: 1,
	originalText: "task",
	blockId: "abc123",
	...overrides,
});

describe("NotificationMatcher.getActiveNotifications", () => {
	describe("one-time events", () => {
		it("matches event on exact date", () => {
			const tasks = [
				createTask({ title: "Birthday", eventDate: "2025-01-15" }),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");

			expect(active).toHaveLength(1);
			expect(active[0].task.title).toBe("Birthday");
			expect(active[0].displayText).toContain("today");
		});

		it("matches within lookback window (1 day ago)", () => {
			const tasks = [
				createTask({ title: "Yesterday", eventDate: "2025-01-14" }),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");

			expect(active).toHaveLength(1);
			expect(active[0].displayText).toContain("1 day ago");
		});

		it("matches within lookback window (2 days ago)", () => {
			const tasks = [
				createTask({ title: "Past Event", eventDate: "2025-01-13" }),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");

			expect(active).toHaveLength(1);
			expect(active[0].displayText).toContain("2 days ago");
		});

		it("matches at edge of lookback window (3 days)", () => {
			const tasks = [
				createTask({
					title: "Edge Case",
					eventDate: "2025-01-12",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");

			expect(active).toHaveLength(1);
			expect(active[0].displayText).toContain("3 days ago");
		});

		it("does not match outside lookback window", () => {
			const tasks = [
				createTask({ title: "Old Event", eventDate: "2025-01-10" }),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");

			expect(active).toHaveLength(0);
		});

		it("does not match future dates", () => {
			const tasks = [
				createTask({
					title: "Future Event",
					eventDate: "2025-01-20",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");

			expect(active).toHaveLength(0);
		});
	});

	describe("yearly repeating events", () => {
		it("matches on anniversary (same month and day)", () => {
			const tasks = [
				createTask({
					title: "Anniversary",
					eventDate: "2020-02-14",
					repeatInterval: "year",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-02-14");

			expect(active).toHaveLength(1);
			expect(active[0].task.title).toBe("Anniversary");
		});

		it("does not match wrong month", () => {
			const tasks = [
				createTask({
					title: "Birthday",
					eventDate: "2020-02-14",
					repeatInterval: "year",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-03-14");

			expect(active).toHaveLength(0);
		});

		it("does not match wrong day outside lookback", () => {
			const tasks = [
				createTask({
					title: "Birthday",
					eventDate: "2020-02-14",
					repeatInterval: "year",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			// 5 days after anniversary (outside 3-day lookback window)
			const active = matcher.getActiveNotifications(tasks, "2025-02-19");

			expect(active).toHaveLength(0);
		});

		it("matches with lookback window", () => {
			const tasks = [
				createTask({
					title: "Anniversary",
					eventDate: "2020-02-14",
					repeatInterval: "year",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			// 2 days after anniversary
			const active = matcher.getActiveNotifications(tasks, "2025-02-16");

			expect(active).toHaveLength(1);
			expect(active[0].displayText).toContain("2 days ago");
		});
	});

	describe("monthly repeating events", () => {
		it("matches on same day of month", () => {
			const tasks = [
				createTask({
					title: "Monthly Meeting",
					eventDate: "2025-01-15",
					repeatInterval: "month",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-02-15");

			expect(active).toHaveLength(1);
		});

		it("does not match wrong day of month", () => {
			const tasks = [
				createTask({
					title: "Monthly Meeting",
					eventDate: "2025-01-15",
					repeatInterval: "month",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-02-16");

			expect(active).toHaveLength(0);
		});
	});

	describe("weekly repeating events", () => {
		it("matches on same day of week", () => {
			const tasks = [
				createTask({
					title: "Weekly Standup",
					eventDate: "2025-01-13", // Monday
					repeatInterval: "week",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-20"); // Next Monday

			expect(active).toHaveLength(1);
		});

		it("does not match wrong day of week", () => {
			const tasks = [
				createTask({
					title: "Weekly Standup",
					eventDate: "2025-01-13", // Monday
					repeatInterval: "week",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-14"); // Tuesday

			expect(active).toHaveLength(0);
		});
	});

	describe("daily repeating events", () => {
		it("matches every day", () => {
			const tasks = [
				createTask({
					title: "Daily Task",
					eventDate: "2025-01-01",
					repeatInterval: "day",
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);

			expect(
				matcher.getActiveNotifications(tasks, "2025-01-15"),
			).toHaveLength(1);
			expect(
				matcher.getActiveNotifications(tasks, "2025-02-01"),
			).toHaveLength(1);
			expect(
				matcher.getActiveNotifications(tasks, "2025-12-31"),
			).toHaveLength(1);
		});
	});

	describe("reminder offsets", () => {
		it("triggers reminder 1 day before event", () => {
			const tasks = [
				createTask({
					title: "Meeting",
					eventDate: "2025-01-15",
					reminderOffsets: [{ number: 1, unit: "day" }],
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-14");

			expect(active).toHaveLength(1);
			expect(active[0].displayText).toContain("1 day early");
		});

		it("uses singular for 1 unit", () => {
			const tasks = [
				createTask({
					title: "Meeting",
					eventDate: "2025-01-15",
					reminderOffsets: [{ number: 1, unit: "week" }],
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-08");

			expect(active).toHaveLength(1);
			expect(active[0].displayText).toContain("1 week early");
			expect(active[0].displayText).not.toContain("weeks");
		});

		it("uses plural for multiple units", () => {
			const tasks = [
				createTask({
					title: "Conference",
					eventDate: "2025-02-01",
					reminderOffsets: [{ number: 2, unit: "week" }],
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-18");

			expect(active).toHaveLength(1);
			expect(active[0].displayText).toContain("2 weeks early");
		});

		it("supports multiple reminders per task", () => {
			const tasks = [
				createTask({
					title: "Big Event",
					eventDate: "2025-02-01",
					reminderOffsets: [
						{ number: 1, unit: "week" },
						{ number: 1, unit: "day" },
					],
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);

			// 1 week before
			const active1 = matcher.getActiveNotifications(tasks, "2025-01-25");
			expect(active1).toHaveLength(1);
			expect(active1[0].displayText).toContain("1 week early");

			// 1 day before
			const active2 = matcher.getActiveNotifications(tasks, "2025-01-31");
			expect(active2).toHaveLength(1);
			expect(active2[0].displayText).toContain("1 day early");

			// Not on other days
			expect(
				matcher.getActiveNotifications(tasks, "2025-01-20"),
			).toHaveLength(0);
		});

		it("shows both event and reminder on event day", () => {
			const tasks = [
				createTask({
					title: "Event",
					eventDate: "2025-01-15",
					reminderOffsets: [{ number: 1, unit: "day" }],
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);

			// On the event day, should show the event itself
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");
			expect(active).toHaveLength(1);
			expect(active[0].displayText).toContain("today");

			// On reminder day
			const activeReminder = matcher.getActiveNotifications(
				tasks,
				"2025-01-14",
			);
			expect(activeReminder).toHaveLength(1);
			expect(activeReminder[0].displayText).toContain("1 day early");
		});
	});

	describe("multiple tasks", () => {
		it("returns all matching tasks", () => {
			const tasks = [
				createTask({ title: "Task 1", eventDate: "2025-01-15" }),
				createTask({ title: "Task 2", eventDate: "2025-01-15" }),
				createTask({ title: "Task 3", eventDate: "2025-01-16" }),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");

			expect(active).toHaveLength(2);
			expect(active.map((a) => a.task.title)).toContain("Task 1");
			expect(active.map((a) => a.task.title)).toContain("Task 2");
		});

		it("combines events and reminders", () => {
			const tasks = [
				createTask({
					title: "Event Today",
					eventDate: "2025-01-15",
				}),
				createTask({
					title: "Event Tomorrow",
					eventDate: "2025-01-16",
					reminderOffsets: [{ number: 1, unit: "day" }],
				}),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");

			expect(active).toHaveLength(2);
			expect(active[0].displayText).toContain("today");
			expect(active[1].displayText).toContain("1 day early");
		});
	});

	describe("edge cases", () => {
		it("handles empty task list", () => {
			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications([], "2025-01-15");

			expect(active).toHaveLength(0);
		});

		it("handles tasks with no block ID", () => {
			const tasks = [
				createTask({ blockId: null, eventDate: "2025-01-15" }),
			];

			const matcher = new NotificationMatcher(DEFAULT_SETTINGS);
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");

			expect(active).toHaveLength(1);
		});

		it("respects custom lookback setting", () => {
			const customSettings = { ...DEFAULT_SETTINGS, lookbackDays: 1 };
			const tasks = [
				createTask({ eventDate: "2025-01-13" }), // 2 days ago
			];

			const matcher = new NotificationMatcher(customSettings);
			const active = matcher.getActiveNotifications(tasks, "2025-01-15");

			// Should not match because lookback is only 1 day
			expect(active).toHaveLength(0);
		});
	});
});
