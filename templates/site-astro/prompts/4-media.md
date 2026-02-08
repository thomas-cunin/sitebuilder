# Prompt 4: Générer media.json

## Usage
```
Copier ce prompt + liste des images disponibles ou à créer
```

---

## Prompt

Je dois créer le fichier `data/media.json` pour un site vitrine.

**Images disponibles:** [Liste des images fournies par le client OU "aucune, utiliser placeholders"]

Génère la configuration média avec cette structure :

```json
{
  "logo": {
    "default": "/images/logo.svg",
    "dark": "/images/logo-dark.svg",
    "favicon": "/favicon.svg"
  },
  "hero": {
    "image": "/images/hero.jpg",
    "alt": {
      "fr": "Description de l'image hero",
      "en": "Hero image description"
    }
  },
  "og": {
    "default": "/images/og-default.jpg"
  },
  "trust": [
    { "name": "Client 1", "logo": "" },
    { "name": "Client 2", "logo": "" },
    { "name": "Client 3", "logo": "" }
  ],
  "testimonials": {
    "avatars": {}
  }
}
```

**Instructions:**
1. **logo**: Chemins vers les fichiers logo (laisser vide si pas encore créés)
2. **hero.image**: Chemin vers l'image principale (laisser "/images/hero.jpg" par défaut)
3. **hero.alt**: Description accessible de l'image en FR et EN
4. **trust**: Noms des clients de référence à afficher. Si logos disponibles, ajouter le chemin
5. **testimonials.avatars**: Optionnel, map "NomAuteur": "/images/avatar-nom.jpg"

Si pas d'images fournies, laisser les chemins par défaut - ils serviront de placeholders.

Écris directement le fichier `data/media.json`.
