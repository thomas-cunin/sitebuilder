# Prompt 1: Générer site.json

## Usage
```
Copier ce prompt + l'URL ou les infos client
```

---

## Prompt

Je dois créer le fichier `data/site.json` pour un site vitrine client.

**Source:** [URL du site existant OU description du client]

Analyse les informations disponibles et génère un JSON avec cette structure exacte :

```json
{
  "name": "",
  "url": "",
  "defaultLang": "fr",
  "langs": ["fr", "en"],
  "contact": {
    "email": "",
    "phone": "",
    "address": {
      "street": "",
      "city": "",
      "zip": "",
      "country": "France"
    }
  },
  "social": {
    "facebook": "",
    "instagram": "",
    "linkedin": "",
    "twitter": ""
  },
  "seo": {
    "titleTemplate": "%s | [NOM]",
    "defaultImage": "/images/og-default.jpg"
  },
  "analytics": {
    "plausible": "",
    "googleAnalytics": ""
  },
  "theme": {
    "primaryColor": "#0ea5e9",
    "secondaryColor": "#d946ef"
  }
}
```

**Instructions:**
1. Extrais le nom de l'entreprise
2. Trouve l'email, téléphone et adresse de contact
3. Récupère les liens vers les réseaux sociaux
4. Pour les couleurs, analyse le design existant ou propose des couleurs adaptées au secteur
5. Laisse analytics vide (sera configuré plus tard)
6. Si une info est introuvable, laisse la chaîne vide ""

Écris directement le fichier `data/site.json` avec les données extraites.
