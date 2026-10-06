# repogarde pour VS Code

Les règles [repogarde](https://github.com/SimBienvenueHoulBoumi/repogarde) directement dans l'éditeur.

- **Assistant de commit** : bouton ✎ dans la vue Git (ou `repogarde : Rédiger un commit conventionnel`). Type, scope, changement incompatible, description, références : le message conforme est écrit dans le champ de commit, avec la longueur d'en-tête contrôlée (72 caractères).
- **Branche** : la barre d'état signale un nom non conforme à `<type>/<sujet>` ; un clic propose le nom corrigé et renomme la branche. Les exceptions (`repogarde.allowedBranches`, `.repogarde.conf`) sont respectées.
- **Hooks** : avertissement si `core.hooksPath` pointe vers un dossier repogarde disparu (les hooks ne s'exécuteraient plus).
- **Validation native** : longueur de l'en-tête signalée par VS Code dans le champ de commit.

Les règles sont identiques à celles des hooks : un message accepté ici l'est aussi au commit et en CI.

## Licence

[MIT](LICENSE)
