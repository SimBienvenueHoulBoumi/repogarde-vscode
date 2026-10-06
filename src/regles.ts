// Règles repogarde (Conventional Commits, nommage des branches), identiques
// à hooks/lib/common.sh : un commit accepté ici l'est aussi par les hooks.

export interface TypeCommit {
  type: string;
  description: string;
}

export const TYPES: readonly TypeCommit[] = [
  { type: "feat", description: "nouvelle fonctionnalité" },
  { type: "fix", description: "correction de bug" },
  { type: "docs", description: "documentation uniquement" },
  { type: "style", description: "formatage, sans changement de logique" },
  { type: "refactor", description: "restructuration sans changement de comportement" },
  { type: "perf", description: "amélioration de performance" },
  { type: "test", description: "ajout ou modification de tests" },
  { type: "build", description: "build, dépendances" },
  { type: "ci", description: "intégration continue" },
  { type: "chore", description: "maintenance diverse" },
  { type: "revert", description: "annulation d'un commit" },
];

export const LONGUEUR_MAX = 72;
const NOMS = TYPES.map((t) => t.type).join("|");
const ALIAS = "feature|bugfix|hotfix";
export const MOTIF_EN_TETE = new RegExp(`^(${NOMS})(\\([a-z0-9._-]+\\))?!?: .+`);
const MOTIF_BRANCHE = new RegExp(`^(${NOMS}|${ALIAS})/[a-z0-9._-]+(/[a-z0-9._-]+)*$`);
export const MOTIF_SCOPE = /^[a-z0-9._-]+$/;
export const BRANCHES_AUTORISEES = ["main", "master", "develop", "release/*"];

/** Longueur en caractères, sans le suffixe « (#123) » ajouté par un merge squash. */
export function longueurAuteur(enTete: string): number {
  return [...enTete.replace(/ \(#[0-9]+\)$/, "")].length;
}

export function enTeteValide(enTete: string): boolean {
  return MOTIF_EN_TETE.test(enTete) && longueurAuteur(enTete) <= LONGUEUR_MAX;
}

function glob(motif: string, texte: string): boolean {
  const re = motif.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${re}$`).test(texte);
}

/** Vrai si la branche respecte <type>/<sujet> ou fait partie des exceptions. */
export function brancheValide(branche: string, autorisees = BRANCHES_AUTORISEES): boolean {
  if (!branche) return true; // HEAD détachée
  return autorisees.some((m) => glob(m, branche)) || MOTIF_BRANCHE.test(branche);
}

/** Propose un nom valide : « Feat/Mon Truc » → « feat/mon-truc ». */
export function suggererBranche(nom: string): string {
  const b = nom
    .toLowerCase()
    .replace(/[ _]/g, "-")
    .replace(/[^a-z0-9._/-]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^[/.-]+/, "")
    .replace(/[/.-]+$/, "");
  if (!b.includes("/")) return `feat/${b || "ma-feature"}`;
  const i = b.indexOf("/");
  const corrections: Record<string, string> = {
    bug: "fix",
    bugs: "fix",
    doc: "docs",
    features: "feat",
    tests: "test",
    refacto: "refactor",
  };
  let type = b.slice(0, i);
  type = corrections[type] ?? type;
  if (!new RegExp(`^(${NOMS}|${ALIAS})$`).test(type)) type = "feat";
  return `${type}/${b.slice(i + 1)}`;
}

/** Type et scope proposés d'après la branche : feat/panier → feat, panier. */
export function defautsDepuisBranche(branche: string): { type: string; scope: string } {
  if (!branche.includes("/")) return { type: "feat", scope: "" };
  let prefixe = branche.slice(0, branche.indexOf("/"));
  if (prefixe === "feature") prefixe = "feat";
  if (prefixe === "bugfix" || prefixe === "hotfix") prefixe = "fix";
  const type = TYPES.some((t) => t.type === prefixe) ? prefixe : "feat";
  const scope = branche
    .slice(branche.indexOf("/") + 1)
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/[^a-z0-9._-]/g, "");
  return { type, scope: scope.length <= 20 ? scope : "" };
}

export interface Message {
  type: string;
  scope?: string;
  incompatible?: string; // description du changement incompatible
  description: string;
  corps?: string;
  references?: string;
}

export function prefixeEnTete(m: Pick<Message, "type" | "scope" | "incompatible">): string {
  return `${m.type}${m.scope ? `(${m.scope})` : ""}${m.incompatible ? "!" : ""}: `;
}

/** Message complet : en-tête, puis corps et pied séparés par une ligne vide. */
export function construireMessage(m: Message): string {
  const pied = [m.incompatible && `BREAKING CHANGE: ${m.incompatible}`, m.references]
    .filter(Boolean)
    .join("\n");
  return [prefixeEnTete(m) + m.description, m.corps?.trim(), pied].filter(Boolean).join("\n\n");
}
