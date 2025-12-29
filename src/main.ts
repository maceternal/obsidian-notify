import { Notice, Plugin, moment } from "obsidian";
import {
  DEFAULT_SETTINGS,
  NotificationSettings,
  NotificationSettingTab,
} from "./settings";
import { NotificationCache } from "./cache";
import { EventManager } from "./events";
import { BlockIdManager } from "./blockid-manager";
import { NotifyBlockRenderer } from "./renderer";
import { NotificationDebugModal } from "./debug-modal";
import { Logger } from "./logger";

export default class NotificationPlugin extends Plugin {
  settings: NotificationSettings;
  cache: NotificationCache;
  eventManager: EventManager;
  blockIdManager: BlockIdManager;
  activeRenderers: Set<NotifyBlockRenderer>;
  logger: Logger;

  async onload() {
    await this.loadSettings();

    // Initialize logger with current setting
    this.logger = new Logger(this.settings.debugLogging);

    // Initialize renderer tracking
    this.activeRenderers = new Set();

    // Wait for workspace to be ready before initializing cache
    this.app.workspace.onLayoutReady(() => {
      void this.initializePlugin();
    });

    // Register notify code block processor
    this.registerMarkdownCodeBlockProcessor("notify", (source, el, ctx) => {
      const renderer = new NotifyBlockRenderer(
        el,
        ctx,
        this,
        this.settings,
        this.logger,
      );
      ctx.addChild(renderer);
    });

    // Add debug command to show all notification tasks
    this.addCommand({
      id: "debug-notifications",
      name: "Show all notification tasks",
      callback: () => {
        if (!this.cache) {
          new Notice("Cache not initialized. Please wait...");
          return;
        }
        const allTasks = this.cache.getAllTasks();
        new NotificationDebugModal(this.app, allTasks).open();
      },
    });

    // Add settings tab
    this.addSettingTab(new NotificationSettingTab(this.app, this));

    this.logger.debug("Notify plugin loaded");
  }

  private async initializePlugin() {
    // Create BlockIdManager
    this.blockIdManager = new BlockIdManager(this.app, this.logger);

    // Initialize cache with BlockIdManager and plugin reference
    this.cache = new NotificationCache(
      this.app,
      this.blockIdManager,
      this,
      this.logger,
    );
    await this.cache.initialize();

    // Start event listeners
    this.eventManager = new EventManager(this.app, this.cache, this.logger);
    this.eventManager.register();
  }

  onunload() {
    // Cleanup event listeners
    this.eventManager.unregister();
    this.logger.debug("Notification plugin unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<NotificationSettings>,
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  registerRenderer(renderer: NotifyBlockRenderer): void {
    this.activeRenderers.add(renderer);
  }

  unregisterRenderer(renderer: NotifyBlockRenderer): void {
    this.activeRenderers.delete(renderer);
  }

  refreshAllNotifications(): void {
    for (const renderer of this.activeRenderers) {
      void renderer.refresh();
    }
  }

  async acknowledgeNotification(key: string, date?: string): Promise<void> {
    const ackDate = date || moment().format("YYYY-MM-DD");
    this.settings.acknowledgements[key] = ackDate;
    await this.saveSettings();
  }

  async unacknowledgeNotification(key: string): Promise<void> {
    delete this.settings.acknowledgements[key];
    await this.saveSettings();
  }

  isAcknowledged(key: string, today: string): boolean {
    const acknowledgedDate = this.settings.acknowledgements[key];
    if (!acknowledgedDate) return false;

    // If acknowledged on or after today, it's still acknowledged
    return acknowledgedDate >= today;
  }
}
