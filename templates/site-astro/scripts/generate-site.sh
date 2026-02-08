#!/bin/bash

#######################################
# Générateur de site client automatique
# Usage: ./scripts/generate-site.sh "https://example.com" "nom-client"
#    ou: ./scripts/generate-site.sh "Description du client" "nom-client"
#######################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Vérifier les arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Usage: $0 <url-ou-description> <nom-client>${NC}"
    echo ""
    echo "Exemples:"
    echo "  $0 \"https://plombier-paris.fr\" \"plombier-dupont\""
    echo "  $0 \"Boulangerie artisanale à Lyon, spécialités pain bio\" \"boulangerie-martin\""
    exit 1
fi

SOURCE="$1"
CLIENT_NAME="$2"
TEMPLATE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$TEMPLATE_DIR/clients/$CLIENT_NAME"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Génération du site: ${GREEN}$CLIENT_NAME${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Créer le dossier client
if [ -d "$OUTPUT_DIR" ]; then
    echo -e "${YELLOW}⚠ Le dossier $OUTPUT_DIR existe déjà${NC}"
    read -p "Écraser ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    rm -rf "$OUTPUT_DIR"
fi

echo -e "${BLUE}📁 Création du dossier client...${NC}"
mkdir -p "$OUTPUT_DIR"

# Copier le template
echo -e "${BLUE}📋 Copie du template...${NC}"
cp -r "$TEMPLATE_DIR/src" "$OUTPUT_DIR/"
cp -r "$TEMPLATE_DIR/public" "$OUTPUT_DIR/"
cp "$TEMPLATE_DIR/package.json" "$OUTPUT_DIR/"
cp "$TEMPLATE_DIR/package-lock.json" "$OUTPUT_DIR/" 2>/dev/null || true
cp "$TEMPLATE_DIR/astro.config.mjs" "$OUTPUT_DIR/"
cp "$TEMPLATE_DIR/tailwind.config.mjs" "$OUTPUT_DIR/"
cp "$TEMPLATE_DIR/tsconfig.json" "$OUTPUT_DIR/"
cp "$TEMPLATE_DIR/Dockerfile" "$OUTPUT_DIR/"
cp "$TEMPLATE_DIR/.gitignore" "$OUTPUT_DIR/"
mkdir -p "$OUTPUT_DIR/data"

# Créer le prompt pour Claude
PROMPT="Tu dois générer les fichiers JSON de configuration pour un site vitrine client.

**Source client:** $SOURCE

**Dossier de sortie:** $OUTPUT_DIR/data/

Génère les 4 fichiers suivants:

## 1. $OUTPUT_DIR/data/site.json
Structure:
{
  \"name\": \"Nom entreprise\",
  \"url\": \"https://...\",
  \"defaultLang\": \"fr\",
  \"langs\": [\"fr\", \"en\"],
  \"contact\": { \"email\": \"\", \"phone\": \"\", \"address\": { \"street\": \"\", \"city\": \"\", \"zip\": \"\", \"country\": \"France\" } },
  \"social\": { \"facebook\": \"\", \"instagram\": \"\", \"linkedin\": \"\", \"twitter\": \"\" },
  \"seo\": { \"titleTemplate\": \"%s | NOM\", \"defaultImage\": \"/images/og-default.jpg\" },
  \"analytics\": { \"plausible\": \"\", \"googleAnalytics\": \"\" },
  \"theme\": { \"primaryColor\": \"#...\", \"secondaryColor\": \"#...\" }
}

## 2. $OUTPUT_DIR/data/navigation.json
Navigation standard avec logo.text = nom entreprise.

## 3. $OUTPUT_DIR/data/content.json
Contenu complet FR/EN: hero (titre accrocheur), 4 services adaptés au secteur, 3 témoignages réalistes, 3 plans tarifaires, 5 FAQ, CTA, contact, footer.
Utilise les icônes: rocket, shield, chart, users

## 4. $OUTPUT_DIR/data/media.json
Chemins images par défaut.

Instructions:
- Adapte TOUT au secteur d'activité du client
- Contenu professionnel et convaincant
- Prix réalistes pour le secteur
- Témoignages crédibles
- Écris directement les 4 fichiers avec l'outil Write"

echo -e "${BLUE}🤖 Lancement de Claude Code...${NC}"
echo ""

# Lancer Claude Code en mode non-interactif
cd "$OUTPUT_DIR"

claude --dangerously-skip-permissions -p "$PROMPT" --output-format stream-json 2>&1 | while IFS= read -r line; do
    # Afficher la progression
    if echo "$line" | grep -q '"type":"assistant"'; then
        echo -ne "${GREEN}.${NC}"
    fi
done

echo ""
echo ""

# Vérifier que les fichiers ont été créés
if [ ! -f "$OUTPUT_DIR/data/site.json" ]; then
    echo -e "${RED}❌ Erreur: site.json n'a pas été créé${NC}"
    exit 1
fi

if [ ! -f "$OUTPUT_DIR/data/content.json" ]; then
    echo -e "${RED}❌ Erreur: content.json n'a pas été créé${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Fichiers JSON générés${NC}"

# Installer les dépendances
echo -e "${BLUE}📦 Installation des dépendances...${NC}"
npm install --silent

# Build
echo -e "${BLUE}🔨 Build du site statique...${NC}"
npm run build --silent

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Site généré avec succès !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  📁 Dossier: ${BLUE}$OUTPUT_DIR${NC}"
echo -e "  🌐 Site:    ${BLUE}$OUTPUT_DIR/dist/${NC}"
echo ""
echo -e "  Commandes:"
echo -e "    cd $OUTPUT_DIR && npm run dev    ${YELLOW}# Prévisualiser${NC}"
echo -e "    cd $OUTPUT_DIR && npm run build  ${YELLOW}# Rebuilder${NC}"
echo ""
