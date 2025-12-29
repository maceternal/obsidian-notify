import { App, TFile, TAbstractFile, EventRef } from "obsidian";
import { NotificationCache } from "./cache";
import { Logger } from "./logger";

export class EventManager {
  private app: App;
  private cache: NotificationCache;
  private debounceTimers: Map<string, number>;
  private eventRefs: EventRef[];
  private logger: Logger;

  constructor(app: App, cache: NotificationCache, logger: Logger) {
    this.app = app;
    this.cache = cache;
    this.debounceTimers = new Map();
    this.eventRefs = [];
    this.logger = logger;
  }

  /**
   * Register event listeners for vault and metadata changes
   */
  register(): void {
    this.logger.debug("Registering event listeners...");

    // Listen for metadata changes (fires after file is parsed)
    const metadataRef = this.app.metadataCache.on("changed", (file) => {
      this.handleFileChanged(file);
    });
    this.eventRefs.push(metadataRef);

    // Listen for file deletions
    const deleteRef = this.app.vault.on("delete", (file) => {
      this.handleFileDeleted(file);
    });
    this.eventRefs.push(deleteRef);

    // Listen for file renames/moves
    const renameRef = this.app.vault.on("rename", (file, oldPath) => {
      this.handleFileRenamed(file, oldPath);
    });
    this.eventRefs.push(renameRef);

    this.logger.debug("Event listeners registered");
  }

  /**
   * Unregister all event listeners (cleanup on plugin unload)
   */
  unregister(): void {
    this.logger.debug("Unregistering event listeners...");

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      window.clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Remove all event listeners
    this.eventRefs.forEach((ref) => this.app.metadataCache.offref(ref));
    this.eventRefs = [];

    this.logger.debug("Event listeners unregistered");
  }

  /**
   * Handle file changed event with debouncing
   */
  private handleFileChanged(file: TFile): void {
    // Clear existing timer for this file
    const existing = this.debounceTimers.get(file.path);
    if (existing) {
      window.clearTimeout(existing);
    }

    // Set new timer - update cache after 500ms of no changes
    const timer = window.setTimeout(() => {
      this.logger.debug(`File changed: ${file.path}`);
      void this.cache.updateFile(file);
      this.debounceTimers.delete(file.path);
    }, 500);

    this.debounceTimers.set(file.path, timer);
  }

  /**
   * Handle file deleted event
   */
  private handleFileDeleted(file: TAbstractFile): void {
    if (file instanceof TFile) {
      this.logger.debug(`File deleted: ${file.path}`);
      this.cache.removeFile(file.path);

      // Clear any pending debounce timer
      const timer = this.debounceTimers.get(file.path);
      if (timer) {
        window.clearTimeout(timer);
        this.debounceTimers.delete(file.path);
      }
    }
  }

  /**
   * Handle file renamed/moved event
   */
  private handleFileRenamed(file: TAbstractFile, oldPath: string): void {
    if (file instanceof TFile) {
      this.logger.debug(`File renamed: ${oldPath} -> ${file.path}`);

      // Remove old path from cache
      this.cache.removeFile(oldPath);

      // Clear any pending debounce timer for old path
      const timer = this.debounceTimers.get(oldPath);
      if (timer) {
        window.clearTimeout(timer);
        this.debounceTimers.delete(oldPath);
      }

      // Update cache with new path
      void this.cache.updateFile(file);
    }
  }
}
