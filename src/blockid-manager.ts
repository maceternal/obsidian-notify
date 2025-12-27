import { App, TFile } from "obsidian";
import { NotificationTask } from "./types";
import { Logger } from "./logger";

export class BlockIdManager {
	private app: App;
	private queue: NotificationTask[];
	private logger: Logger;

	constructor(app: App, logger: Logger) {
		this.app = app;
		this.queue = [];
		this.logger = logger;
	}

	/**
	 * Add a task to the queue for block ID generation
	 */
	queueTask(task: NotificationTask): void {
		if (!task.blockId) {
			this.queue.push(task);
		}
	}

	/**
	 * Check if there are tasks in the queue
	 */
	hasQueuedTasks(): boolean {
		return this.queue.length > 0;
	}

	/**
	 * Process all queued tasks and add block IDs to files
	 */
	async processQueue(): Promise<void> {
		if (this.queue.length === 0) {
			return;
		}

		this.logger.debug(
			`Processing ${this.queue.length} tasks for block ID addition`,
		);

		// Group tasks by file for efficient processing
		const tasksByFile = this.groupByFile(this.queue);

		// Process each file sequentially
		for (const [filePath, tasks] of tasksByFile) {
			await this.addBlockIdsToFile(filePath, tasks);
		}

		// Clear the queue
		const processed = this.queue.length;
		this.queue = [];

		this.logger.debug(`Added block IDs to ${processed} tasks`);
	}

	/**
	 * Group tasks by file path
	 */
	private groupByFile(
		tasks: NotificationTask[],
	): Map<string, NotificationTask[]> {
		const grouped = new Map<string, NotificationTask[]>();

		for (const task of tasks) {
			const existing = grouped.get(task.filePath) || [];
			existing.push(task);
			grouped.set(task.filePath, existing);
		}

		return grouped;
	}

	/**
	 * Add block IDs to tasks in a specific file
	 */
	private async addBlockIdsToFile(
		filePath: string,
		tasks: NotificationTask[],
	): Promise<void> {
		// Get the file
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			console.warn(`File not found: ${filePath}`);
			return;
		}

		try {
			// Use vault.process() for atomic file modification
			await this.app.vault.process(file, (content) => {
				const lines = content.split("\n");

				for (const task of tasks) {
					const lineIndex = task.lineNumber - 1; // Convert to 0-indexed
					const line = lines[lineIndex];

					if (!line) {
						console.warn(
							`Line ${task.lineNumber} not found in ${filePath}`,
						);
						continue;
					}

					// Safety check: verify line hasn't changed
					if (line !== task.originalText) {
						console.warn(
							`Line ${task.lineNumber} in ${filePath} has changed, skipping block ID addition`,
						);
						continue;
					}

					// Generate block ID and append to line
					const blockId = this.generateBlockId();
					lines[lineIndex] = line + " ^" + blockId;

					// Update the task object with the new block ID
					task.blockId = blockId;

					this.logger.debug(
						`Added block ID ^${blockId} to task in ${filePath}:${task.lineNumber}`,
					);
				}

				return lines.join("\n");
			});
		} catch (error) {
			console.error(`Error adding block IDs to ${filePath}:`, error);
		}
	}

	/**
	 * Generate a random block ID
	 */
	private generateBlockId(): string {
		return Math.random().toString(36).substring(2, 8);
	}
}
