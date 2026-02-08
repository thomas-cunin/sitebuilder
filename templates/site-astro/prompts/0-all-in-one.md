# Prompt Complet: Générer tous les JSON

## Usage
```
Pour générer tous les fichiers d'un coup
```

---

## Prompt

Je dois créer tous les fichiers JSON pour un nouveau site vitrine client.

**Client:** [URL du site existant OU nom + secteur d'activité + description]

Génère les 4 fichiers suivants dans le dossier `data/`. **RESPECTE STRICTEMENT les structures JSON ci-dessous**.

---

### 1. data/site.json

```json
{
  "name": "Nom entreprise",
  "url": "https://domaine.com",
  "defaultLang": "fr",
  "langs": ["fr", "en"],
  "contact": {
    "email": "",
    "phone": "",
    "address": { "street": "", "city": "", "zip": "", "country": "France" }
  },
  "social": {
    "facebook": "",
    "instagram": "",
    "linkedin": "",
    "twitter": "",
    "github": ""
  },
  "seo": {
    "titleTemplate": "%s | NOM",
    "defaultImage": "/images/og-default.jpg"
  },
  "analytics": {
    "plausible": "",
    "googleAnalytics": ""
  },
  "theme": {
    "primaryColor": "#3b82f6",
    "secondaryColor": "#8b5cf6"
  }
}
```

---

### 2. data/navigation.json

```json
{
  "header": {
    "logo": { "text": "NOM_ENTREPRISE", "image": "" },
    "links": [
      { "id": "services", "href": "#services" },
      { "id": "testimonials", "href": "#testimonials" },
      { "id": "pricing", "href": "#pricing" },
      { "id": "faq", "href": "#faq" },
      { "id": "contact", "href": "#contact" }
    ],
    "cta": { "id": "contact", "href": "#contact" }
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

---

### 3. data/content.json

**STRUCTURE CRITIQUE** - Format: `section.lang.key` pour hero/services/etc.

```json
{
  "nav": {
    "fr": { "home": "Accueil", "services": "Services", "testimonials": "Témoignages", "pricing": "Tarifs", "faq": "FAQ", "contact": "Contact", "privacy": "Confidentialité", "terms": "Mentions légales" },
    "en": { "home": "Home", "services": "Services", "testimonials": "Testimonials", "pricing": "Pricing", "faq": "FAQ", "contact": "Contact", "privacy": "Privacy", "terms": "Terms" }
  },
  "hero": {
    "fr": { "title": "...", "subtitle": "...", "cta_primary": "...", "cta_secondary": "...", "trust_label": "..." },
    "en": { "title": "...", "subtitle": "...", "cta_primary": "...", "cta_secondary": "...", "trust_label": "..." }
  },
  "services": {
    "fr": { "title": "...", "subtitle": "..." },
    "en": { "title": "...", "subtitle": "..." },
    "items": [
      { "icon": "rocket", "title": { "fr": "...", "en": "..." }, "description": { "fr": "...", "en": "..." } },
      { "icon": "shield", "title": { "fr": "...", "en": "..." }, "description": { "fr": "...", "en": "..." } },
      { "icon": "chart", "title": { "fr": "...", "en": "..." }, "description": { "fr": "...", "en": "..." } },
      { "icon": "users", "title": { "fr": "...", "en": "..." }, "description": { "fr": "...", "en": "..." } }
    ]
  },
  "testimonials": {
    "fr": { "title": "...", "subtitle": "..." },
    "en": { "title": "...", "subtitle": "..." },
    "items": [
      { "content": { "fr": "...", "en": "..." }, "author": "...", "role": "...", "company": "...", "rating": 5 },
      { "content": { "fr": "...", "en": "..." }, "author": "...", "role": "...", "company": "...", "rating": 5 },
      { "content": { "fr": "...", "en": "..." }, "author": "...", "role": "...", "company": "...", "rating": 5 }
    ]
  },
  "pricing": {
    "fr": { "title": "...", "subtitle": "...", "popular": "Recommandé", "cta": "Choisir", "perMonth": "/jour" },
    "en": { "title": "...", "subtitle": "...", "popular": "Recommended", "cta": "Choose", "perMonth": "/day" },
    "items": [
      { "name": "Starter", "price": "...", "description": { "fr": "...", "en": "..." }, "features": { "fr": ["..."], "en": ["..."] }, "popular": false },
      { "name": "Pro", "price": "...", "description": { "fr": "...", "en": "..." }, "features": { "fr": ["..."], "en": ["..."] }, "popular": true },
      { "name": "Enterprise", "price": "Sur devis", "description": { "fr": "...", "en": "..." }, "features": { "fr": ["..."], "en": ["..."] }, "popular": false }
    ]
  },
  "faq": {
    "fr": { "title": "...", "subtitle": "..." },
    "en": { "title": "...", "subtitle": "..." },
    "items": [
      { "question": { "fr": "...", "en": "..." }, "answer": { "fr": "...", "en": "..." } },
      { "question": { "fr": "...", "en": "..." }, "answer": { "fr": "...", "en": "..." } },
      { "question": { "fr": "...", "en": "..." }, "answer": { "fr": "...", "en": "..." } },
      { "question": { "fr": "...", "en": "..." }, "answer": { "fr": "...", "en": "..." } },
      { "question": { "fr": "...", "en": "..." }, "answer": { "fr": "...", "en": "..." } }
    ]
  },
  "cta": {
    "fr": { "title": "...", "subtitle": "...", "button": "..." },
    "en": { "title": "...", "subtitle": "...", "button": "..." }
  },
  "contact": {
    "fr": { "title": "...", "subtitle": "...", "form": { "name": "Nom", "email": "Email", "phone": "Téléphone", "message": "Message", "submit": "Envoyer", "success": "Message envoyé !", "error": "Erreur, réessayez." } },
    "en": { "title": "...", "subtitle": "...", "form": { "name": "Name", "email": "Email", "phone": "Phone", "message": "Message", "submit": "Send", "success": "Message sent!", "error": "Error, try again." } }
  },
  "footer": {
    "fr": { "description": "...", "rights": "Tous droits réservés" },
    "en": { "description": "...", "rights": "All rights reserved" }
  }
}
```

---

### 4. data/media.json

```json
{
  "logo": {
    "default": "/images/logo.svg",
    "dark": "/images/logo-dark.svg",
    "favicon": "/favicon.svg"
  },
  "hero": {
    "image": "",
    "alt": { "fr": "...", "en": "..." }
  },
  "og": {
    "default": "/images/og-default.jpg"
  },
  "trust": [
    { "name": "Tech1", "logo": "" },
    { "name": "Tech2", "logo": "" },
    { "name": "Tech3", "logo": "" }
  ],
  "testimonials": {
    "avatars": {}
  }
}
```

---

**Instructions CRITIQUES:**
1. **NE MODIFIE PAS la structure JSON** - Remplis uniquement les valeurs "..."
2. Analyse le site/description fourni
3. Adapte tout le contenu au secteur d'activité
4. Crée des textes professionnels et convaincants
5. Traduis tout en EN également
6. Pour les prix, propose des montants réalistes pour le secteur
7. Pour les témoignages, crée des noms/entreprises crédibles
8. Pour trust[], liste les technologies ou partenaires pertinents

Écris les 4 fichiers directement.
