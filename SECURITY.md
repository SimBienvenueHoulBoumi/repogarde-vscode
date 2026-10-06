# Sécurité

Signaler une vulnérabilité : [avis de sécurité privé](https://github.com/SimBienvenueHoulBoumi/repogarde-vscode/security/advisories/new), jamais une issue publique.

## Vérifier un paquet

Chaque `.vsix` joint à une release est construit par la CI depuis le tag et attesté (provenance Sigstore) :

```bash
gh attestation verify repogarde-X.Y.Z.vsix --repo SimBienvenueHoulBoumi/repogarde-vscode
```
