// Mêmes cas que les tests bats de repogarde : l'extension et les hooks
// doivent accepter et refuser exactement les mêmes choses.
import { describe, expect, it } from "vitest";
import {
  brancheValide,
  construireMessage,
  defautsDepuisBranche,
  enTeteValide,
  longueurAuteur,
  suggererBranche,
} from "../src/regles";

describe("en-tête de commit", () => {
  it.each([
    "feat: ajoute le panier",
    "fix(api): corrige le timeout",
    "feat!: supprime l'ancienne API",
    "chore(deps-dev): met à jour vitest",
  ])("accepte %s", (h) => expect(enTeteValide(h)).toBe(true));

  it.each([
    "ajoute le panier",
    "Feat: majuscule",
    "feat:sans espace",
    "feature: alias de branche seulement",
    "feat(API): scope en majuscules",
    `feat: ${"x".repeat(67)}`,
  ])("refuse %s", (h) => expect(enTeteValide(h)).toBe(false));
});

describe("longueur", () => {
  it("compte les caractères, pas les octets", () => expect(longueurAuteur("été")).toBe(3));
  it("ignore le suffixe de merge squash", () => expect(longueurAuteur("fix: x (#123)")).toBe(6));
  it("72 caractères passent, 73 non", () => {
    expect(enTeteValide(`feat: ${"é".repeat(66)}`)).toBe(true);
    expect(enTeteValide(`feat: ${"é".repeat(67)}`)).toBe(false);
  });
});

describe("branches", () => {
  it.each(["feat/panier", "fix/api/timeout", "feature/x", "hotfix/1.2", "main", "release/2.0", ""])(
    "accepte « %s »",
    (b) => expect(brancheValide(b)).toBe(true),
  );
  it.each(["panier", "Feat/panier", "feat/Mon-Truc", "wip/x", "feat/"])("refuse « %s »", (b) =>
    expect(brancheValide(b)).toBe(false),
  );
  it("exceptions configurées", () => {
    expect(brancheValide("dependabot/npm/x", ["dependabot/*"])).toBe(true);
    expect(brancheValide("main", ["develop"])).toBe(false);
  });
  it.each([
    ["Feat/Mon Truc", "feat/mon-truc"],
    ["mon_truc", "feat/mon-truc"],
    ["bug/crash", "fix/crash"],
    ["refacto//x/", "refactor/x"],
    ["wip/x", "feat/x"],
    ["", "feat/ma-feature"],
  ])("suggère %s → %s", (avant, apres) => expect(suggererBranche(avant)).toBe(apres));
});

describe("défauts depuis la branche", () => {
  it.each([
    ["feat/panier", "feat", "panier"],
    ["bugfix/login", "fix", "login"],
    ["docs/api/v2", "docs", "api-v2"],
    ["main", "feat", ""],
    ["wip/x", "feat", "x"],
    ["feat/un-sujet-beaucoup-trop-long", "feat", ""],
  ])("%s → %s(%s)", (b, type, scope) => expect(defautsDepuisBranche(b)).toEqual({ type, scope }));
});

describe("message", () => {
  it("en-tête seul", () => expect(construireMessage({ type: "fix", description: "corrige" })).toBe("fix: corrige"));
  it("complet", () =>
    expect(
      construireMessage({
        type: "feat",
        scope: "api",
        incompatible: "supprime /v1",
        description: "nouvelle API",
        corps: "Parce que.\n",
        references: "Closes #12",
      }),
    ).toBe("feat(api)!: nouvelle API\n\nParce que.\n\nBREAKING CHANGE: supprime /v1\nCloses #12"));
});
