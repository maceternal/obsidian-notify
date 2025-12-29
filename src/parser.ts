import { moment } from "obsidian";
import { ReminderOffset } from "./types";

export class TaskParser {
	/**
	 * Check if a task line contains the notification bell emoji
	 */
	static hasNotificationMarker(text: string): boolean {
		return text.includes("🔔");
	}

	/**
	 * Extract the event date from task text
	 * Format: 📆 YYYY-MM-DD
	 */
	static extractDate(text: string): string | null {
		const match = text.match(/📆\s*(\d{4}-\d{2}-\d{2})/);
		return match?.[1] ?? null;
	}

	/**
	 * Extract the repeat interval
	 * Format: 🔁 day|week|month|year
	 */
	static extractRepeatInterval(
		text: string,
	): "day" | "week" | "month" | "year" | null {
		const match = text.match(/🔁\s*(day|week|month|year)/);
		if (match) {
			return match[1] as "day" | "week" | "month" | "year";
		}
		return null;
	}

	/**
	 * Extract all reminder offsets from task text
	 * Format: 1️⃣ week, 2️⃣ day, etc.
	 */
	static extractReminderOffsets(text: string): ReminderOffset[] {
		const offsets: ReminderOffset[] = [];

		// Match patterns like "1️⃣ week", "2️⃣ day", etc.
		// Emoji numbers can have different encodings:
		// - \u0031\uFE0F\u20E3 (digit + variation selector + keycap)
		// - \u0031\u200D\u20E3 (digit + zero-width joiner + keycap)
		// So we match: digit + optional variation selector/joiner + keycap
		const regex = /([1-9])[\uFE0F\u200D]?\u20E3\s*(day|week|month|year)/g;
		let match;

		while ((match = regex.exec(text)) !== null) {
			const num = match[1];
			const unit = match[2];
			if (num && unit) {
				offsets.push({
					number: parseInt(num),
					unit: unit as "day" | "week" | "month" | "year",
				});
			}
		}

		return offsets;
	}

	/**
	 * Extract the title (everything before the date marker)
	 */
	static extractTitle(text: string): string {
		// Remove any list marker and checkbox syntax at the start
		// Handle various formats: "- [ ]", "* [ ]", unicode variants, etc.
		let cleaned = text.replace(/^[\s\-*|←→•]+\[.\]\s*/, "");

		// If that didn't match, try simpler patterns
		if (cleaned === text) {
			cleaned = text.replace(/^\s*[-*]\s*\[.\]\s*/, "");
		}

		// Split at the date marker and take everything before it
		const parts = cleaned.split("📆");
		const firstPart = parts[0];
		if (firstPart !== undefined) {
			return firstPart.trim();
		}

		return cleaned.trim();
	}

	/**
	 * Extract block ID from task text
	 * Format: ^blockid at end of line
	 */
	static extractBlockId(text: string): string | null {
		const match = text.match(/\^([a-zA-Z0-9-]+)\s*$/);
		return match?.[1] ?? null;
	}

	/**
	 * Generate a random block ID
	 */
	static generateBlockId(): string {
		return Math.random().toString(36).substring(2, 8);
	}

	/**
	 * Extract date from filename
	 * Supports common daily note formats:
	 * - YYYY-MM-DD.md
	 * - YYYY-MM-DD Note Title.md
	 * - Notes/YYYY-MM-DD.md
	 */
	static extractDateFromFilename(filepath: string): string | null {
		// Extract basename (filename without path)
		const filename = filepath.split("/").pop() || "";

		// Remove .md extension
		const basename = filename.replace(/\.md$/, "");

		// Pattern: YYYY-MM-DD at start of filename
		const match = basename.match(/^(\d{4}-\d{2}-\d{2})/);
		if (match?.[1] && moment(match[1], "YYYY-MM-DD", true).isValid()) {
			return match[1];
		}

		return null;
	}
}
