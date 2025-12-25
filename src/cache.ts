import { App, TFile, ListItemCache } from "obsidian";
import { NotificationTask } from "./types";
import { TaskParser } from "./parser";
import { BlockIdManager } from "./blockid-manager";
import type NotificationPlugin from "./main";

export class NotificationCache {
	private app: App;
	private cache: Map<string, NotificationTask[]>; // filePath -> tasks
	private blockIdManager: BlockIdManager;
	private plugin: NotificationPlugin;

	constructor(
		app: App,
		blockIdManager: BlockIdManager,
		plugin: NotificationPlugin,
	) {
		this.app = app;
		this.cache = new Map();
		this.blockIdManager = blockIdManager;
		this.plugin = plugin;
	}

	/**
	 * Initialize cache by scanning all markdown files
	 */
	async initialize(): Promise<void> {
		console.debug("Initializing notification cache...");
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			await this.updateFile(file);
		}

		console.debug(
			`Notification cache initialized with ${this.cache.size} files`,
		);

		// Process all queued tasks for block ID addition
		await this.blockIdManager.processQueue();
	}

	/**
	 * Update cache for a specific file
	 */
	async updateFile(file: TFile): Promise<void> {
		// Get parsed metadata from Obsidian's cache
		const fileCache = this.app.metadataCache.getFileCache(file);
		const listItems = fileCache?.listItems || [];

		// If no list items at all, remove from cache and return
		if (listItems.length === 0) {
			this.cache.delete(file.path);
			return;
		}

		// Read file content once
		const content = await this.app.vault.read(file);
		const lines = content.split("\n");

		// Parse tasks from metadata
		const tasks = this.parseTasksFromMetadata(lines, listItems, file.path);

		if (tasks.length > 0) {
			this.cache.set(file.path, tasks);

			// Process any newly queued tasks immediately (for real-time updates)
			if (this.blockIdManager.hasQueuedTasks()) {
				await this.blockIdManager.processQueue();
			}
		} else {
			// Remove from cache if no notification tasks found
			this.cache.delete(file.path);
		}

		// Trigger refresh of all notification blocks
		this.plugin.refreshAllNotifications();
	}

	/**
	 * Remove a file from the cache
	 */
	removeFile(filePath: string): void {
		this.cache.delete(filePath);
	}

	/**
	 * Get all notification tasks across all files
	 */
	getAllTasks(): NotificationTask[] {
		const allTasks: NotificationTask[] = [];
		for (const tasks of this.cache.values()) {
			allTasks.push(...tasks);
		}
		return allTasks;
	}

	/**
	 * Parse notification tasks from metadata
	 */
	private parseTasksFromMetadata(
		lines: string[],
		listItems: ListItemCache[],
		filePath: string,
	): NotificationTask[] {
		const tasks: NotificationTask[] = [];

		for (const item of listItems) {
			// Skip if not a task (regular bullet point)
			if (item.task === undefined) {
				continue;
			}

			// Get the line content
			const lineNumber = item.position.start.line; // 0-indexed
			const line = lines[lineNumber];
			if (!line) continue;

			// Check if it has the notification bell
			if (!TaskParser.hasNotificationMarker(line)) {
				continue;
			}

			// Extract all components using TaskParser
			const title = TaskParser.extractTitle(line);
			const eventDate = TaskParser.extractDate(line);
			const repeatInterval = TaskParser.extractRepeatInterval(line);
			const reminderOffsets = TaskParser.extractReminderOffsets(line);
			const blockId = TaskParser.extractBlockId(line);

			// Only add if we have at least a date
			if (!eventDate) {
				continue;
			}

			const task: NotificationTask = {
				filePath,
				lineNumber: lineNumber + 1, // Store as 1-indexed
				blockId: blockId || "",
				title,
				eventDate,
				repeatInterval,
				reminderOffsets,
				originalText: line,
			};

			// Queue task for block ID generation if missing
			if (!task.blockId) {
				this.blockIdManager.queueTask(task);
			}

			tasks.push(task);
		}

		return tasks;
	}

	/**
	 * Get statistics about the cache
	 */
	getStats(): { fileCount: number; taskCount: number } {
		return {
			fileCount: this.cache.size,
			taskCount: this.getAllTasks().length,
		};
	}
}
