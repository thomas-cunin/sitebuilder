# Prompt 3: Générer navigation.json

## Usage
```
Copier ce prompt (rarement besoin de modifier, structure standard)
```

---

## Prompt

Je dois créer le fichier `data/navigation.json` pour un site vitrine.

**Logo:** [Texte du logo OU chemin vers image si disponible]

Génère la navigation avec cette structure :

```json
{
  "header": {
    "logo": {
      "text": "NOM_ENTREPRISE",
      "image": ""
    },
    "links": [
      { "id": "services", "href": "#services" },
      { "id": "testimonials", "href": "#testimonials" },
      { "id": "pricing", "href": "#pricing" },
      { "id": "faq", "href": "#faq" },
      { "id": "contact", "href": "#contact" }
    ],
    "cta": {
      "id": "contact",
      "href": "#contact"
    }
  },
  "footer": {
    "links": [
      { "id": "services", "href": "#services" },
      { "id": "testimonials", "href": "#testimonials" },
      { "id": "pricing", "href": "#pricing" },
      { "id": "faq", "href": "#faq" }
    ],
    "legal": [
      { "id": "privacy", "href": "/privacy" },
      { "id": "terms", "href": "/terms" }
    ]
  }
}
```

**Instructions:**
1. Remplace "NOM_ENTREPRISE" par le nom du client
2. Si un logo image existe, mets le chemin dans "image" (ex: "/images/logo.svg")
3. La structure des liens est standard, ne la modifie que si le client a des besoins spécifiques

Écris directement le fichier `data/navigation.json`.
