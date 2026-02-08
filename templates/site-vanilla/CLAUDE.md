# Site Vanilla HTML/CSS/JS

## Description

Template de base pour les sites statiques HTML/CSS/JS générés par SiteBuilder.
Ce template utilise des CDNs pour éviter tout build step.

## Stack technique

| Composant | Solution |
|---|---|
| **CSS** | Tailwind CSS via CDN avec config runtime |
| **JS** | Alpine.js pour l'interactivité |
| **Icônes** | Lucide Icons via CDN |
| **Polices** | Google Fonts |

## Structure

```
site-vanilla/
├── index.html              # Page d'accueil
├── page-template.html      # Template pour nouvelles pages
├── css/
│   └── styles.css          # Styles personnalisés
├── js/
│   └── main.js             # JavaScript Alpine.js + utils
├── sections/               # 16 templates de sections
│   ├── hero.html
│   ├── features.html
│   ├── about.html
│   ├── services.html
│   ├── testimonials.html
│   ├── team.html
│   ├── pricing.html
│   ├── faq.html
│   ├── cta.html
│   ├── contact.html
│   ├── stats.html
│   ├── gallery.html
│   ├── partners.html
│   ├── newsletter.html
│   ├── content.html
│   └── video.html
├── components/
│   ├── header.html
│   ├── footer.html
│   └── nav.html
└── assets/                 # Images et fichiers statiques
```

## CDNs utilisés

```html
<!-- Tailwind CSS avec config runtime -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Alpine.js pour l'interactivité -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!-- Lucide Icons -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
```

## Conventions

### HTML
- Structure sémantique avec `<header>`, `<main>`, `<section>`, `<footer>`
- Attributs `id` uniques pour chaque section
- Classes Tailwind pour le styling
- Alpine.js pour l'interactivité (x-data, x-show, @click)

### Sections
- Chaque section est autonome et peut être incluse dans n'importe quelle page
- Les sections utilisent des commentaires pour indiquer les slots de contenu
- Pattern: `<!-- SLOT: nom_du_slot -->`

### JavaScript
- Alpine.js pour les interactions simples (accordéons, menus, onglets)
- Pas de framework complexe
- Code vanilla pour les fonctionnalités avancées

### Images
- Placer les images dans `/assets/`
- Utiliser des images optimisées (WebP préféré)
- Attributs `loading="lazy"` pour les images below-the-fold

## Génération

Lors de la génération, Claude Code doit:

1. **Copier le template** dans le dossier projet
2. **Injecter les tokens Tailwind** depuis 05-design.json dans la config runtime
3. **Générer les sections HTML** selon l'architecture
4. **Assembler les pages** avec les sections
5. **Écrire le contenu** réel dans les slots
6. **Finaliser** la navigation, le footer et le SEO

## Interactivité Alpine.js

### Menu mobile
```html
<div x-data="{ open: false }">
  <button @click="open = !open">Menu</button>
  <nav x-show="open" x-transition>...</nav>
</div>
```

### FAQ Accordéon
```html
<div x-data="{ active: null }">
  <div @click="active = active === 1 ? null : 1">
    Question 1
  </div>
  <div x-show="active === 1" x-collapse>Réponse 1</div>
</div>
```

### Onglets
```html
<div x-data="{ tab: 'tab1' }">
  <button @click="tab = 'tab1'" :class="{ 'active': tab === 'tab1' }">Tab 1</button>
  <div x-show="tab === 'tab1'">Contenu 1</div>
</div>
```

## Points d'attention

1. **Pas de build step** - Tout fonctionne directement dans le navigateur
2. **SEO** - Ajouter les meta tags appropriés dans `<head>`
3. **Performance** - Les CDNs sont rapides mais attention au nombre de requêtes
4. **Accessibilité** - Utiliser les attributs ARIA appropriés
5. **Responsive** - Utiliser les classes responsive de Tailwind (sm:, md:, lg:)
