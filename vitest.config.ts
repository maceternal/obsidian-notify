import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
	},
	resolve: {
		alias: {
			// Mock obsidian module for testing
			obsidian: path.resolve(__dirname, "src/__tests__/mocks/obsidian.ts"),
		},
	},
});
