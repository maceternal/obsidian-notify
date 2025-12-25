import { App, PluginSettingTab, Setting } from "obsidian";
import NotificationPlugin from "./main";
import { NotificationAcknowledgements } from "./types";

export interface NotificationSettings {
	lookbackDays: number;
	acknowledgements: NotificationAcknowledgements;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
	lookbackDays: 3,
	acknowledgements: {},
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

		new Setting(containerEl).setName("Notifications").setHeading();

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
	}
}
