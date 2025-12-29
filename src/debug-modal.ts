import { Modal, App } from "obsidian";
import { NotificationTask } from "./types";

export class NotificationDebugModal extends Modal {
  private tasks: NotificationTask[];

  constructor(app: App, tasks: NotificationTask[]) {
    super(app);
    this.tasks = tasks;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("notification-debug-modal");

    // Header
    contentEl.createEl("h2", { text: "Notification tasks debug" });

    // Summary
    const fileCount = this.groupTasksByFile().size;
    const summary = contentEl.createEl("div", { cls: "task-summary" });
    summary.createEl("p", {
      text: `${this.tasks.length} tasks across ${fileCount} files`,
    });

    // Handle empty state
    if (this.tasks.length === 0) {
      contentEl.createEl("p", {
        text: "No notification tasks found in your vault.",
        cls: "task-empty",
      });
      return;
    }

    // Render tasks grouped by file
    this.renderTasksByFile(contentEl);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private groupTasksByFile(): Map<string, NotificationTask[]> {
    const grouped = new Map<string, NotificationTask[]>();

    for (const task of this.tasks) {
      const existing = grouped.get(task.filePath) || [];
      existing.push(task);
      grouped.set(task.filePath, existing);
    }

    return grouped;
  }

  private renderTasksByFile(container: HTMLElement) {
    const grouped = this.groupTasksByFile();
    const sortedFiles = Array.from(grouped.keys()).sort();

    for (const filePath of sortedFiles) {
      const tasks = grouped.get(filePath);
      if (tasks) {
        this.renderFileGroup(container, filePath, tasks);
      }
    }
  }

  private renderFileGroup(
    container: HTMLElement,
    filePath: string,
    tasks: NotificationTask[],
  ) {
    const fileGroup = container.createEl("div", { cls: "file-group" });

    // File header - clickable to open file
    const header = fileGroup.createEl("h3", { cls: "file-header" });
    header.setText(`📁 ${filePath} (${tasks.length} tasks)`);
    header.addEventListener("click", () => {
      void (async () => {
        await this.app.workspace.openLinkText(filePath, "", "tab");
        this.close();
      })();
    });

    // Task list
    const taskList = fileGroup.createEl("div", { cls: "task-list" });

    for (const task of tasks) {
      this.renderTask(taskList, task);
    }
  }

  private renderTask(container: HTMLElement, task: NotificationTask) {
    const taskItem = container.createEl("div", { cls: "task-item" });

    // Make task item clickable to navigate to task location
    taskItem.addEventListener("click", () => {
      void (async () => {
        const linkText = task.blockId
          ? `${task.filePath}#^${task.blockId}`
          : `${task.filePath}`;
        await this.app.workspace.openLinkText(linkText, "", "tab");
        this.close();
      })();
    });

    // Title
    taskItem.createEl("div", {
      text: task.title,
      cls: "task-title",
    });

    // Details container
    const details = taskItem.createEl("div", { cls: "task-details" });

    // Event date
    const repeatText = task.repeatInterval
      ? ` | 🔁 repeats every ${task.repeatInterval}`
      : "";
    details.createEl("div", {
      text: `📆 ${task.eventDate}${repeatText}`,
      cls: "task-date",
    });

    // Reminders
    if (task.reminderOffsets.length > 0) {
      const reminders = task.reminderOffsets
        .map((r) => {
          const unit = r.number === 1 ? r.unit : `${r.unit}s`;
          return `${r.number} ${unit} before`;
        })
        .join(", ");
      details.createEl("div", {
        text: `🔔 Reminders: ${reminders}`,
        cls: "task-reminders",
      });
    }

    // Location
    const locationText = task.blockId
      ? `📍 Line ${task.lineNumber} | ^${task.blockId}`
      : `📍 Line ${task.lineNumber}`;
    details.createEl("div", {
      text: locationText,
      cls: "task-location",
    });
  }
}
