import { defineConfig } from "vitest/config";

// Tests unitaires seulement : ceux de test/integration tournent dans VS Code (vscode-test)
export default defineConfig({
  test: { include: ["test/*.test.ts"] },
});
