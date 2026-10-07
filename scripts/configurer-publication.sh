#!/usr/bin/env bash
# Configure la publication de l'extension sur le Marketplace VS Code et Open VSX.
# Ouvre chaque page au bon moment, attend ta validation, demande chaque jeton
# en saisie masquée, le vérifie, puis l'enregistre comme secret de
# l'environnement « production » : lisible seulement par un job approuvé.
# Aucun jeton n'est affiché, écrit dans un fichier ou passé en argument.
#
#   bash scripts/configurer-publication.sh
set -euo pipefail

REPO="${REPO:-SimBienvenueHoulBoumi/repogarde-vscode}"
VSCE="npx -y @vscode/vsce@4.0.0"
OVSX="npx -y ovsx@1.2.0"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✔\033[0m %s\n' "$*"; }
ko() { printf '  \033[31m✖\033[0m %s\n' "$*" >&2; }

ouvrir() {
    echo "  → $1"
    if command -v open >/dev/null; then open "$1"
    elif command -v xdg-open >/dev/null; then xdg-open "$1" >/dev/null 2>&1
    elif command -v cmd.exe >/dev/null; then cmd.exe /c start "" "$1"
    else echo "  (ouvre ce lien dans ton navigateur)"
    fi
}

attendre() { read -r -p "  Appuie sur Entrée quand c'est fait… " _; }

# Lit un jeton sans l'afficher ; résultat dans la variable JETON
lire_jeton() {
    JETON=""
    while [ -z "$JETON" ]; do
        read -r -s -p "  Colle le jeton (saisie masquée) : " JETON
        echo
    done
}

# --- Prérequis -------------------------------------------------------------

bold "0. Vérifications"
command -v gh >/dev/null || { ko "gh absent : https://cli.github.com"; exit 1; }
command -v npx >/dev/null || { ko "Node.js (npx) absent : https://nodejs.org"; exit 1; }
gh auth status >/dev/null 2>&1 || { ko "gh non connecté : lance « gh auth login »"; exit 1; }
if ! gh repo view "$REPO" >/dev/null 2>&1; then
    read -r -p "  Le dépôt $REPO n'existe pas. Le créer (public) ? [O/n] " rep
    case "$rep" in [nN]*) ko "Dépôt requis pour stocker les secrets."; exit 1 ;; esac
    gh repo create "$REPO" --public \
        --description "Extension VS Code pour repogarde : assistant de commit, branches, hooks" >/dev/null
fi
ok "gh connecté, dépôt $REPO accessible"
# Environnement de publication (approbation : repogarde/bin/proteger --environnement production)
if ! gh api "repos/$REPO/environments/production" --silent 2>/dev/null; then
    gh api -X PUT "repos/$REPO/environments/production" --silent
    echo "  Environnement « production » créé sans approbation : la poser avec"
    echo "  repogarde/bin/proteger --repo $REPO --environnement production"
fi

bold "1. Identifiant d'éditeur"
echo "  Il apparaîtra dans le nom de l'extension (<id>.repogarde) et ne pourra plus changer."
while :; do
    read -r -p "  Identifiant choisi (lettres, chiffres, tirets) : " EDITEUR
    [[ "$EDITEUR" =~ ^[A-Za-z0-9][A-Za-z0-9-]*$ ]] && break
    ko "Format invalide."
done

# --- Marketplace VS Code ---------------------------------------------------

bold "2. Marketplace VS Code : créer l'éditeur « $EDITEUR »"
echo "  Connecte-toi avec un compte Microsoft, puis « Create publisher » avec l'ID $EDITEUR."
ouvrir "https://marketplace.visualstudio.com/manage/createpublisher"
attendre

bold "3. Marketplace VS Code : jeton de publication (Azure DevOps)"
cat <<'EOF'
  User settings → Personal access tokens → New Token :
    • Organization : All accessible organizations   (obligatoire)
    • Scopes : Custom defined → Marketplace → Manage
    • Expiration : 1 an par exemple
EOF
ouvrir "https://dev.azure.com/"
while :; do
    lire_jeton
    if VSCE_PAT="$JETON" $VSCE verify-pat "$EDITEUR" >/dev/null 2>&1; then
        ok "Jeton valide pour l'éditeur $EDITEUR"
        break
    fi
    ko "Jeton refusé (organisation « All accessible organizations » et scope Marketplace Manage ?). Réessaie."
done
printf '%s' "$JETON" | gh secret set VSCE_PAT --repo "$REPO" --env production
JETON=""
ok "Secret VSCE_PAT enregistré"

# --- Open VSX --------------------------------------------------------------

bold "4. Open VSX : compte et accord de publication"
cat <<'EOF'
  Connecte-toi avec GitHub, puis dans Settings → Profile, signe le
  « Publisher Agreement » (il demande de relier un compte Eclipse gratuit).
EOF
ouvrir "https://open-vsx.org/user-settings/profile"
attendre

bold "5. Open VSX : jeton d'accès"
echo "  Settings → Access Tokens → Generate New Token."
ouvrir "https://open-vsx.org/user-settings/tokens"
lire_jeton
if OVSX_PAT="$JETON" $OVSX verify-pat "$EDITEUR" >/dev/null 2>&1; then
    ok "Espace de noms $EDITEUR déjà accessible"
else
    echo "  Création de l'espace de noms $EDITEUR…"
    if OVSX_PAT="$JETON" $OVSX create-namespace "$EDITEUR" >/dev/null 2>&1 &&
        OVSX_PAT="$JETON" $OVSX verify-pat "$EDITEUR" >/dev/null 2>&1; then
        ok "Espace de noms $EDITEUR créé"
    else
        JETON=""
        ko "Échec : accord de publication signé ? nom $EDITEUR déjà pris sur Open VSX ?"
        exit 1
    fi
fi
printf '%s' "$JETON" | gh secret set OVSX_PAT --repo "$REPO" --env production
JETON=""
ok "Secret OVSX_PAT enregistré"

# --- Fin -------------------------------------------------------------------

gh variable set PUBLISHER --repo "$REPO" --body "$EDITEUR" >/dev/null
ok "Variable PUBLISHER = $EDITEUR"

bold "Terminé"
echo "  La CI peut maintenant publier l'extension sur le Marketplace et Open VSX."
echo "  Secrets de « production » : $(gh secret list --repo "$REPO" --env production | cut -f1 | tr '\n' ' ')"
