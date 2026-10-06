import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "test/integration/**/*.test.cjs",
  workspaceFolder: ".",
  mocha: { ui: "tdd", timeout: 60000 },
});
