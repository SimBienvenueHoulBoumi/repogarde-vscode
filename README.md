# repogarde pour VS Code

[![CI](https://github.com/SimBienvenueHoulBoumi/repogarde-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/SimBienvenueHoulBoumi/repogarde-vscode/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/SimBienvenueHoulBoumi/repogarde-vscode)](https://github.com/SimBienvenueHoulBoumi/repogarde-vscode/releases)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

Les règles [repogarde](https://github.com/SimBienvenueHoulBoumi/repogarde) directement dans l'éditeur : un commit préparé ici est accepté par les hooks et par la CI, sans aller-retour.

## Fonctionnalités

- **Assistant de commit** : bouton ✎ dans la vue Git, ou commande `repogarde : Rédiger un commit conventionnel`. Type (proposé d'après la branche), scope, changement incompatible, description, références : le message conforme est écrit dans le champ de commit, longueur de l'en-tête contrôlée (72 caractères). Le corps se complète ensuite dans le champ, après une ligne vide.
- **Nom de branche** : la barre d'état signale une branche non conforme à `<type>/<sujet>` ; un clic propose le nom corrigé (`Feat/Mon Truc` → `feat/mon-truc`) et renomme la branche. Les exceptions du projet sont respectées (`repogarde.allowedBranches` dans git config ou `.repogarde.conf`).
- **Hooks inactifs** : avertissement si `core.hooksPath` pointe vers un dossier repogarde disparu (dossier déplacé ou supprimé), cas où les hooks cessent de s'exécuter sans rien dire.
- **Validation native** : longueur de l'en-tête signalée par VS Code dans le champ de commit (`git.inputValidation`, 72 caractères).

| Commande | Rôle |
|---|---|
| `repogarde : Rédiger un commit conventionnel` | assistant de commit |
| `repogarde : Renommer la branche selon la convention` | renommage guidé |

## Installation

Prérequis : VS Code 1.100 ou plus récent, Git. L'extension complète repogarde (hooks et CI) mais fonctionne aussi seule.

En attendant la publication sur le Marketplace et Open VSX, installer le `.vsix` de la [dernière release](https://github.com/SimBienvenueHoulBoumi/repogarde-vscode/releases/latest) :

```bash
code --install-extension repogarde-X.Y.Z.vsix
```

Chaque `.vsix` est construit par la CI depuis le tag et attesté ; vérification :

```bash
gh attestation verify repogarde-X.Y.Z.vsix --repo SimBienvenueHoulBoumi/repogarde-vscode
```

## Développement

```bash
npm ci --ignore-scripts
npm test                  # tests unitaires (règles identiques aux hooks)
npm run build && npm run test:integration   # dans un vrai VS Code
npx vsce package --no-dependencies          # paquet .vsix
```

Versions et publication sont automatiques : les commits conventionnels sur `main` alimentent une PR de release, mergée par la CI, puis le `.vsix` est attesté, joint à la release et publié (Marketplace, Open VSX). Configuration unique de la publication : `scripts/configurer-publication.sh`.

## Licence

[MIT](LICENSE)
