export interface ReminderOffset {
	number: number;
	unit: "day" | "week" | "month" | "year";
}

export interface NotificationTask {
	// Source location
	filePath: string;
	lineNumber: number;
	blockId: string;

	// Parsed content
	title: string;
	eventDate: string; // YYYY-MM-DD format
	repeatInterval: "day" | "week" | "month" | "year" | null;
	reminderOffsets: ReminderOffset[];

	// Original task text
	originalText: string;
}

export interface ActiveNotification {
	task: NotificationTask;
	reminderOffset: ReminderOffset | null; // null means it's the event day itself
	displayText: string;
}

export interface NotificationAcknowledgements {
	[key: string]: string; // "filePath:lineNumber:offset" -> "acknowledgedDate"
}
