import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import * as vscode from "vscode";
import {
  BRANCHES_AUTORISEES,
  LONGUEUR_MAX,
  MOTIF_SCOPE,
  TYPES,
  brancheValide,
  construireMessage,
  defautsDepuisBranche,
  longueurAuteur,
  prefixeEnTete,
  suggererBranche,
} from "./regles";

const execFileAsync = promisify(execFile);

// Sous-ensemble de l'API de l'extension Git intégrée (vscode.git)
interface Depot {
  rootUri: vscode.Uri;
  inputBox: { value: string };
  state: { HEAD?: { name?: string }; onDidChange: vscode.Event<void> };
}
interface ApiGit {
  repositories: Depot[];
  onDidOpenRepository: vscode.Event<Depot>;
}

let barre: vscode.StatusBarItem;

export async function activate(contexte: vscode.ExtensionContext): Promise<void> {
  const extGit = vscode.extensions.getExtension<{ getAPI(v: 1): ApiGit }>("vscode.git");
  const git = (await extGit?.activate())?.getAPI(1);

  barre = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  barre.command = "repogarde.renommerBranche";
  contexte.subscriptions.push(
    barre,
    vscode.commands.registerCommand("repogarde.commit", (scm?: { rootUri?: vscode.Uri }) =>
      assistantCommit(git, scm?.rootUri),
    ),
    vscode.commands.registerCommand("repogarde.renommerBranche", () => renommerBranche(git)),
  );

  if (!git) return;
  const suivre = (d: Depot) => {
    contexte.subscriptions.push(d.state.onDidChange(() => void majBarre(git)));
    void verifierHooks(d);
  };
  git.repositories.forEach(suivre);
  contexte.subscriptions.push(
    git.onDidOpenRepository((d) => {
      suivre(d);
      void majBarre(git);
    }),
    vscode.window.onDidChangeActiveTextEditor(() => void majBarre(git)),
  );
  await majBarre(git);
}

export function deactivate(): void {}

/** Dépôt de l'éditeur actif, sinon le premier. */
function depotCourant(git: ApiGit | undefined, uri?: vscode.Uri): Depot | undefined {
  if (!git?.repositories.length) return undefined;
  const cible = uri ?? vscode.window.activeTextEditor?.document.uri;
  const candidats = git.repositories.filter((d) => cible?.fsPath.startsWith(d.rootUri.fsPath));
  return candidats.sort((a, b) => b.rootUri.fsPath.length - a.rootUri.fsPath.length)[0] ?? git.repositories[0];
}

async function gitConfig(racine: string, ...args: string[]): Promise<string> {
  try {
    return (await execFileAsync("git", ["-C", racine, "config", ...args])).stdout.trim();
  } catch {
    return "";
  }
}

/** Exceptions de nommage : git config, puis .repogarde.conf, comme les hooks. */
async function branchesAutorisees(racine: string): Promise<string[]> {
  const valeur =
    (await gitConfig(racine, "--get", "repogarde.allowedBranches")) ||
    (await gitConfig(racine, "-f", join(racine, ".repogarde.conf"), "--get", "repogarde.allowedBranches"));
  return valeur ? valeur.split(/\s+/) : BRANCHES_AUTORISEES;
}

async function majBarre(git: ApiGit): Promise<void> {
  const depot = depotCourant(git);
  const branche = depot?.state.HEAD?.name;
  if (!depot || !branche) {
    barre.hide();
    return;
  }
  if (brancheValide(branche, await branchesAutorisees(depot.rootUri.fsPath))) {
    barre.text = `$(check) ${branche}`;
    barre.tooltip = "Nom de branche conforme (repogarde)";
    barre.backgroundColor = undefined;
  } else {
    barre.text = `$(warning) ${branche}`;
    barre.tooltip = `Nom non conforme : <type>/<sujet>. Cliquer pour renommer en ${suggererBranche(branche)}`;
    barre.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  }
  barre.show();
}

async function renommerBranche(git: ApiGit | undefined): Promise<void> {
  const depot = depotCourant(git);
  const branche = depot?.state.HEAD?.name;
  if (!depot || !branche) return;
  const nouveau = await vscode.window.showInputBox({
    title: `Renommer ${branche}`,
    value: suggererBranche(branche),
    prompt: "Format : <type>/<sujet>, ex. feat/panier",
    validateInput: (v) => (brancheValide(v, []) ? undefined : "Format attendu : <type>/<sujet> en minuscules"),
  });
  if (!nouveau || nouveau === branche) return;
  try {
    await execFileAsync("git", ["-C", depot.rootUri.fsPath, "branch", "-m", branche, nouveau]);
    void vscode.window.showInformationMessage(
      `Branche renommée en ${nouveau}. Si elle était poussée : git push origin -u ${nouveau} && git push origin --delete ${branche}`,
    );
  } catch (e) {
    void vscode.window.showErrorMessage(`Renommage impossible : ${(e as Error).message}`);
  }
}

/** Hooks repogarde configurés mais introuvables (dossier déplacé ou supprimé). */
async function verifierHooks(depot: Depot): Promise<void> {
  const chemin = await gitConfig(depot.rootUri.fsPath, "--get", "core.hooksPath");
  if (!chemin || !/repogarde|githooks/.test(chemin)) return;
  const absolu = chemin.startsWith("/") || /^[A-Za-z]:/.test(chemin) ? chemin : join(depot.rootUri.fsPath, chemin);
  if (existsSync(join(absolu, "pre-commit"))) return;
  void vscode.window.showWarningMessage(
    `repogarde : core.hooksPath pointe vers ${chemin}, introuvable. Les hooks ne s'exécutent plus. ` +
      "Relance install.sh depuis le nouvel emplacement de repogarde.",
  );
}

async function assistantCommit(git: ApiGit | undefined, uri?: vscode.Uri): Promise<void> {
  const depot = depotCourant(git, uri);
  if (!depot) {
    void vscode.window.showWarningMessage("Aucun dépôt Git ouvert.");
    return;
  }
  const defauts = defautsDepuisBranche(depot.state.HEAD?.name ?? "");

  const choix = await vscode.window.showQuickPick(
    TYPES.map((t) => ({ label: t.type, description: t.description, picked: t.type === defauts.type })).sort(
      (a, b) => Number(b.picked) - Number(a.picked),
    ),
    { title: "Commit (1/5) : type de changement", placeHolder: "feat, fix, docs…" },
  );
  if (!choix) return;

  const scope = await vscode.window.showInputBox({
    title: "Commit (2/5) : scope (optionnel)",
    value: defauts.scope,
    prompt: "Partie du projet concernée ; vide pour aucun",
    validateInput: (v) => (!v || MOTIF_SCOPE.test(v) ? undefined : "Minuscules, chiffres, . _ - uniquement"),
  });
  if (scope === undefined) return;

  const incompatibleChoix = await vscode.window.showQuickPick(["Non", "Oui : version majeure"], {
    title: "Commit (3/5) : changement incompatible ?",
  });
  if (!incompatibleChoix) return;
  let incompatible = "";
  if (incompatibleChoix !== "Non") {
    const r = await vscode.window.showInputBox({
      title: "Décris le changement incompatible",
      validateInput: (v) => (v.trim() ? undefined : "Obligatoire pour un changement majeur"),
    });
    if (r === undefined) return;
    incompatible = r.trim();
  }

  const prefixe = prefixeEnTete({ type: choix.label, scope, incompatible });
  const description = await vscode.window.showInputBox({
    title: "Commit (4/5) : description",
    prompt: prefixe,
    validateInput: (v) => {
      if (!v.trim()) return "La description est obligatoire";
      const n = longueurAuteur(prefixe + v);
      return n > LONGUEUR_MAX ? `En-tête trop long : ${n} caractères (${LONGUEUR_MAX} max)` : undefined;
    },
  });
  if (description === undefined) return;

  const references = await vscode.window.showInputBox({
    title: "Commit (5/5) : références (optionnel)",
    placeHolder: "Closes #12",
  });
  if (references === undefined) return;

  // Le corps se rédige ensuite directement dans le champ de message
  depot.inputBox.value = construireMessage({
    type: choix.label,
    scope,
    incompatible,
    description: description.trim(),
    references: references.trim(),
  });
  await vscode.commands.executeCommand("workbench.view.scm");
  void vscode.window.showInformationMessage(
    "Message prêt dans le champ de commit. Ajoute un corps (pourquoi) après une ligne vide si utile.",
  );
}
