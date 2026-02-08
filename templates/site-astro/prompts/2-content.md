# Prompt 2: Générer content.json

## Usage
```
Copier ce prompt + l'URL ou les infos client
```

---

## Prompt

Je dois créer le fichier `data/content.json` pour un site vitrine client.

**Source:** [URL du site existant OU description du client + secteur d'activité]

Génère tout le contenu textuel en FR et EN avec cette structure :

```json
{
  "nav": {
    "fr": { "home": "Accueil", "services": "Services", "testimonials": "Témoignages", "pricing": "Tarifs", "faq": "FAQ", "contact": "Contact", "privacy": "Confidentialité", "terms": "Mentions légales" },
    "en": { "home": "Home", "services": "Services", "testimonials": "Testimonials", "pricing": "Pricing", "faq": "FAQ", "contact": "Contact", "privacy": "Privacy", "terms": "Terms" }
  },
  "hero": {
    "fr": { "title": "", "subtitle": "", "cta_primary": "Commencer", "cta_secondary": "En savoir plus", "trust_label": "Ils nous font confiance :" },
    "en": { "title": "", "subtitle": "", "cta_primary": "Get Started", "cta_secondary": "Learn More", "trust_label": "They trust us:" }
  },
  "services": {
    "fr": { "title": "Nos Services", "subtitle": "" },
    "en": { "title": "Our Services", "subtitle": "" },
    "items": [
      { "icon": "rocket|shield|chart|users", "title": { "fr": "", "en": "" }, "description": { "fr": "", "en": "" } }
    ]
  },
  "testimonials": {
    "fr": { "title": "Ce que disent nos clients", "subtitle": "" },
    "en": { "title": "What Our Clients Say", "subtitle": "" },
    "items": [
      { "content": { "fr": "", "en": "" }, "author": "", "role": "", "company": "", "rating": 5 }
    ]
  },
  "pricing": {
    "fr": { "title": "Nos Tarifs", "subtitle": "", "popular": "Populaire", "cta": "Choisir", "perMonth": "/mois" },
    "en": { "title": "Our Pricing", "subtitle": "", "popular": "Popular", "cta": "Choose", "perMonth": "/month" },
    "items": [
      { "name": "", "price": "", "description": { "fr": "", "en": "" }, "features": { "fr": [], "en": [] }, "popular": false }
    ]
  },
  "faq": {
    "fr": { "title": "Questions Fréquentes", "subtitle": "" },
    "en": { "title": "Frequently Asked Questions", "subtitle": "" },
    "items": [
      { "question": { "fr": "", "en": "" }, "answer": { "fr": "", "en": "" } }
    ]
  },
  "cta": {
    "fr": { "title": "", "subtitle": "", "button": "Nous contacter" },
    "en": { "title": "", "subtitle": "", "button": "Contact Us" }
  },
  "contact": {
    "fr": { "title": "Contactez-nous", "subtitle": "", "form": { "name": "Nom", "email": "Email", "phone": "Téléphone", "message": "Message", "submit": "Envoyer", "success": "Message envoyé !", "error": "Erreur, réessayez." } },
    "en": { "title": "Contact Us", "subtitle": "", "form": { "name": "Name", "email": "Email", "phone": "Phone", "message": "Message", "submit": "Send", "success": "Message sent!", "error": "Error, try again." } }
  },
  "footer": {
    "fr": { "description": "", "rights": "Tous droits réservés" },
    "en": { "description": "", "rights": "All rights reserved" }
  }
}
```

**Instructions:**
1. **Hero**: Crée un titre accrocheur et un sous-titre qui décrit la proposition de valeur
2. **Services**: Génère 4 services pertinents pour ce secteur. Icônes disponibles: rocket, shield, chart, users
3. **Testimonials**: Crée 3 témoignages réalistes avec noms, postes et entreprises crédibles
4. **Pricing**: Crée 3 plans (entrée, pro, enterprise) avec prix et fonctionnalités adaptés au secteur
5. **FAQ**: Génère 5 questions/réponses pertinentes pour ce type d'activité
6. **CTA**: Phrase d'accroche incitative
7. Tout doit être en FR ET EN

Écris directement le fichier `data/content.json`.
