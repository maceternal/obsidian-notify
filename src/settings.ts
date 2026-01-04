import { App, PluginSettingTab, Setting } from "obsidian";
import NotificationPlugin from "./main";
import { NotificationAcknowledgements } from "./types";

export interface NotificationSettings {
  lookbackDays: number;
  acknowledgements: NotificationAcknowledgements;
  debugLogging: boolean;
  useFileDate: boolean;
  excludedFolders: string[];
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  lookbackDays: 3,
  acknowledgements: {},
  debugLogging: false,
  useFileDate: true,
  excludedFolders: ["Templates"],
};

export class NotificationSettingTab extends PluginSettingTab {
  plugin: NotificationPlugin;

  constructor(app: App, plugin: NotificationPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Notifications")
      .setDesc("Configure notification behavior");

    new Setting(containerEl)
      .setName("Lookback window (days)")
      .setDesc(
        "Show past events for this many days (recommended: 2-3 for weekends, max: 7)",
      )
      .addText((text) =>
        text
          .setPlaceholder("3")
          .setValue(String(this.plugin.settings.lookbackDays))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0 && num <= 7) {
              this.plugin.settings.lookbackDays = num;
              await this.plugin.saveSettings();
            }
          }),
      );

    new Setting(containerEl)
      .setName("Use file date for notifications")
      .setDesc(
        "Extract date from filename (e.g., 2026-01-07.md) to determine which notifications to show. Falls back to today's date if no date found.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useFileDate)
          .onChange(async (value) => {
            this.plugin.settings.useFileDate = value;
            await this.plugin.saveSettings();
            // Refresh all renderers to apply new setting
            this.plugin.refreshAllNotifications();
          }),
      );

    new Setting(containerEl)
      .setName("Debug logging")
      .setDesc("Enable debug logging to console (for troubleshooting)")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.debugLogging)
          .onChange(async (value) => {
            this.plugin.settings.debugLogging = value;
            this.plugin.logger.setDebugEnabled(value);
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc(
        "Folders to exclude from notification scanning (one per line). " +
          "Subfolders are automatically excluded",
      )
      .addTextArea((text) =>
        text
          .setPlaceholder("Templates\narchive\n.trash")
          .setValue(this.plugin.settings.excludedFolders.join("\n"))
          .onChange(async (value) => {
            const folders = value
              .split("\n")
              .map((f) => f.trim())
              .filter((f) => f.length > 0);

            this.plugin.settings.excludedFolders = folders;
            await this.plugin.saveSettings();
            await this.plugin.reinitializeCache();
          }),
      );
  }
}
