import {
	MarkdownRenderChild,
	MarkdownRenderer,
	MarkdownPostProcessorContext,
	moment,
} from "obsidian";
import NotificationPlugin from "./main";
import { NotificationMatcher } from "./matcher";
import { ActiveNotification } from "./types";

export class NotifyBlockRenderer extends MarkdownRenderChild {
	private plugin: NotificationPlugin;
	private sourcePath: string;
	private lastRenderHash: string = "";

	constructor(
		containerEl: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		plugin: NotificationPlugin,
	) {
		super(containerEl);
		this.plugin = plugin;
		this.sourcePath = ctx.sourcePath;
	}

	onload() {
		// Register this renderer with the plugin
		this.plugin.registerRenderer(this);

		// Render the notification block
		void this.render();
	}

	onunload() {
		// Unregister this renderer
		this.plugin.unregisterRenderer(this);
	}

	async refresh() {
		// Don't refresh if cache isn't ready
		if (!this.plugin.cache) {
			return;
		}

		// Only re-render if the notifications actually changed
		const allTasks = this.plugin.cache.getAllTasks();
		const today = moment().format("YYYY-MM-DD");
		const matcher = new NotificationMatcher(this.plugin.settings);
		const activeNotifications = matcher.getActiveNotifications(
			allTasks,
			today,
		);

		// Create a hash of current notifications
		const currentHash = this.hashNotifications(activeNotifications);

		// Only re-render if something changed
		if (currentHash !== this.lastRenderHash) {
			this.lastRenderHash = currentHash;
			await this.render();
		}
	}

	private hashNotifications(notifications: ActiveNotification[]): string {
		// Create a simple hash of the notifications to detect changes
		return notifications
			.map(
				(n) =>
					`${n.task.filePath}:${n.task.lineNumber}:${n.reminderOffset?.number ?? "event"}`,
			)
			.sort()
			.join("|");
	}

	private getNotificationKey(notif: ActiveNotification): string {
		const offset = notif.reminderOffset
			? `${notif.reminderOffset.number}-${notif.reminderOffset.unit}`
			: "event";
		return `${notif.task.filePath}:${notif.task.lineNumber}:${offset}`;
	}

	private async render() {
		// Wait for cache to be initialized
		if (!this.plugin.cache) {
			this.containerEl.empty();
			this.containerEl.createEl("p", {
				text: "Loading notifications...",
				cls: "notification-loading",
			});
			return;
		}

		// Get all tasks from cache
		const allTasks = this.plugin.cache.getAllTasks();

		// Get today's date
		const today = moment().format("YYYY-MM-DD");

		// Use matcher to find active notifications
		const matcher = new NotificationMatcher(this.plugin.settings);
		const activeNotifications = matcher.getActiveNotifications(
			allTasks,
			today,
		);

		// Update hash
		this.lastRenderHash = this.hashNotifications(activeNotifications);

		// Clear previous content
		this.containerEl.empty();

		// Add CSS class for styling
		this.containerEl.addClass("notification-block");

		if (activeNotifications.length === 0) {
			this.containerEl.createEl("p", {
				text: "No notifications for today",
				cls: "notification-empty",
			});
			return;
		}

		// Create a task list
		const ul = this.containerEl.createEl("ul", {
			cls: "contains-task-list",
		});

		for (const notif of activeNotifications) {
			await this.renderNotificationItem(ul, notif);
		}
	}

	private async renderNotificationItem(
		ul: HTMLElement,
		notif: ActiveNotification,
	) {
		const task = notif.task;

		// Create list item
		const li = ul.createEl("li", { cls: "task-list-item" });

		// Create checkbox
		const checkbox = li.createEl("input", {
			type: "checkbox",
			cls: "task-list-item-checkbox",
		});

		// Get notification key and check if acknowledged
		const key = this.getNotificationKey(notif);
		const today = moment().format("YYYY-MM-DD");
		const isAcknowledged = this.plugin.isAcknowledged(key, today);

		// Set checkbox state
		checkbox.checked = isAcknowledged;

		// Add acknowledged class if checked
		if (isAcknowledged) {
			li.addClass("acknowledged");
		}

		// Listen for checkbox changes
		this.registerDomEvent(checkbox, "change", () => {
			void (async () => {
				if (checkbox.checked) {
					await this.plugin.acknowledgeNotification(key);
					li.addClass("acknowledged");
				} else {
					await this.plugin.unacknowledgeNotification(key);
					li.removeClass("acknowledged");
				}
			})();
		});

		// Create a span for the content
		const contentSpan = li.createEl("span");

		// Build the markdown for the link and details
		const link = task.blockId
			? `[[${task.filePath}#^${task.blockId}|${task.title}]]`
			: `[[${task.filePath}|${task.title}]]`;

		// Extract context
		const dateMatch = notif.displayText.match(/📆\s*([^\s]+)/);
		const contextMatch = notif.displayText.match(/—\s*\*([^*]+)\*/);

		const date = dateMatch ? dateMatch[1] : task.eventDate;
		const context = contextMatch ? contextMatch[1] : "today";

		// Determine if past event
		const isPast = context?.includes("ago") ?? false;
		const dateDisplay = isPast ? `~~${date}~~` : date;

		// Render the markdown content
		const markdown = `${link} 📆 ${dateDisplay} — *${context}*`;
		await MarkdownRenderer.render(
			this.plugin.app,
			markdown,
			contentSpan,
			this.sourcePath,
			this,
		);
	}
}
