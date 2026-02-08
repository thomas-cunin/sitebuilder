# Prompts pour générer les JSON

Ces prompts permettent de générer automatiquement les fichiers de configuration à partir d'une URL de site client ou d'informations sur le client.

## Utilisation

### Option 1: Fichiers séparés (recommandé)

Plus précis, meilleur contrôle sur chaque fichier.

```bash
# 1. D'abord les infos de base
# Copier prompts/1-site.md + URL client

# 2. Ensuite le contenu
# Copier prompts/2-content.md + URL/description

# 3. Navigation (souvent standard)
# Copier prompts/3-navigation.md

# 4. Médias
# Copier prompts/4-media.md + liste images
```

### Option 2: Tout en un

Plus rapide mais moins précis.

```bash
# Copier prompts/0-all-in-one.md + URL/description client
```

## Ordre recommandé

| # | Fichier | Prompt | Priorité |
|---|---------|--------|----------|
| 1 | site.json | 1-site.md | Essentiel |
| 2 | content.json | 2-content.md | Essentiel |
| 3 | navigation.json | 3-navigation.md | Standard (rarement modifié) |
| 4 | media.json | 4-media.md | Après avoir les images |

## Exemple d'utilisation

```
Moi: [Copier le contenu de prompts/1-site.md]

Source: https://example-client.com

Claude: [Génère data/site.json]
```

## Tips

- **URL existante**: Claude peut scraper les infos de contact, réseaux sociaux, etc.
- **Nouveau client**: Fournir nom + secteur + description de l'activité
- **Couleurs**: Si le client a une charte graphique, préciser les codes hex
- **Contenu**: Plus tu donnes de contexte sur l'activité, meilleur sera le contenu généré
