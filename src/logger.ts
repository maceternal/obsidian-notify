export class Logger {
	private debugEnabled: boolean;

	constructor(debugEnabled: boolean = false) {
		this.debugEnabled = debugEnabled;
	}

	setDebugEnabled(enabled: boolean): void {
		this.debugEnabled = enabled;
	}

	debug(...args: unknown[]): void {
		if (this.debugEnabled) {
			console.debug(...args);
		}
	}

	// Always show warnings and errors
	warn(...args: unknown[]): void {
		console.warn(...args);
	}

	error(...args: unknown[]): void {
		console.error(...args);
	}
}
