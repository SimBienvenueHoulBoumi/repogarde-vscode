// Test d'intégration : l'extension s'active dans un vrai VS Code et ses commandes existent
const assert = require("node:assert");
const vscode = require("vscode");

suite("activation", () => {
  test("commandes enregistrées", async () => {
    const ext = vscode.extensions.all.find((e) => e.packageJSON.name === "repogarde");
    assert.ok(ext, "extension introuvable");
    await ext.activate();
    const commandes = await vscode.commands.getCommands(true);
    assert.ok(commandes.includes("repogarde.commit"));
    assert.ok(commandes.includes("repogarde.renommerBranche"));
  });

  test("validation du message de commit activée par défaut", () => {
    const git = vscode.workspace.getConfiguration("git");
    assert.strictEqual(git.get("inputValidationSubjectLength"), 72);
  });
});
