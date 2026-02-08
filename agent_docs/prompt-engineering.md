# Prompt Engineering

## Vue d'ensemble

Le pipeline SiteRebuilder utilise deux modes d'interaction avec Claude :

1. **API Anthropic** (étapes 2-5) : Analyse textuelle, production de JSON structuré
2. **Claude Code CLI** (étape 6) : Génération de code, accès filesystem

---

## Principes fondamentaux

### 1. Output structuré obligatoire

Chaque prompt d'analyse doit produire un JSON validable par Zod. Utiliser des instructions explicites :

```typescript
const systemPrompt = `Tu es un expert en analyse de sites web.
Tu DOIS répondre uniquement avec un JSON valide.
Ne produis AUCUN texte avant ou après le JSON.
Le JSON doit suivre exactement le schéma fourni.`
```

### 2. Contexte minimal mais suffisant

Ne pas envoyer tous les artefacts — seulement ceux nécessaires à l'étape :

| Étape | Contexte requis |
|---|---|
| 2 - Analyse | Artefact 01 (scraping) |
| 3 - Inspiration | Artefact 02 + données scraping des inspirations |
| 4 - Architecture | Artefacts 02 + 03 |
| 5 - Design | Artefacts 03 + 04 |
| 6 - Génération | Artefacts 04 + 05 (par sous-étape) |

### 3. Exemples concrets

Toujours inclure 1-2 exemples du format attendu :

```typescript
const userPrompt = `
Voici les données scrapées :
${JSON.stringify(scrapingData)}

Produis une analyse au format :
{
  "businessType": "restaurant gastronomique",
  "targetAudience": "couples 35-55 ans, CSP+",
  "toneOfVoice": "formal",
  ...
}
`
```

---

## Prompts d'analyse (API Anthropic)

### Étape 2 — Analyse du site source

```typescript
export const analyzePrompt = {
  system: `Tu es un expert en analyse UX et marketing digital.
Tu analyses des sites web et produis des insights structurés.
Tu DOIS répondre uniquement avec un JSON valide suivant le schéma fourni.`,

  user: (scrapingData: string, screenshots: string[]) => `
## Site à analyser

Données scrapées :
${scrapingData}

${screenshots.length > 0 ? `
Screenshots (above the fold des pages principales) :
[Les images sont jointes au message]
` : ''}

## Analyse demandée

Produis un JSON avec les champs suivants :

{
  "businessType": "string - secteur d'activité détaillé",
  "targetAudience": "string - description du public cible",
  "toneOfVoice": "formal" | "casual" | "technical" | "friendly",
  "strengths": ["string - 3 à 5 forces du site"],
  "weaknesses": ["string - 3 à 5 faiblesses"],
  "designAssessment": {
    "modernity": 1-10,
    "coherence": 1-10,
    "accessibility": 1-10,
    "comments": "string"
  },
  "essentialPages": [{"path": "string", "purpose": "string"}],
  "secondaryPages": [{"path": "string", "purpose": "string"}],
  "features": [{"name": "string", "type": "string", "priority": "must" | "nice"}],
  "seoBaseline": {
    "hasMetaTitles": boolean,
    "hasMetaDescriptions": boolean,
    "headingStructure": "good" | "poor",
    "internalLinking": "good" | "poor"
  }
}

IMPORTANT : Utilise les screenshots pour évaluer les aspects visuels (couleurs réelles, layout, hiérarchie visuelle). Ne te base pas uniquement sur les données textuelles.
`,
}
```

### Étape 3 — Analyse des inspirations

```typescript
export const inspirationPrompt = {
  system: `Tu es un expert en design web et benchmarking.
Tu compares des sites web et extrais des patterns de design actionnables.
Réponds uniquement avec un JSON valide.`,

  user: (sourceAnalysis: string, inspirations: InspirationsData[]) => `
## Site source

${sourceAnalysis}

## Sites d'inspiration

${inspirations.map((inspi, i) => `
### Inspiration ${i + 1}: ${inspi.url}
Données : ${JSON.stringify(inspi.data)}
`).join('\n')}

## Analyse croisée demandée

{
  "inspirations": [
    {
      "url": "string",
      "designPatterns": ["pattern identifié"],
      "colorScheme": ["hex codes"],
      "typography": {
        "headings": "string",
        "body": "string"
      },
      "strengths": ["ce qui fonctionne bien"],
      "applicableTo": ["ce qu'on peut appliquer au site source"]
    }
  ],
  "synthesis": {
    "visualRecommendations": ["recommandations concrètes"],
    "layoutPatterns": ["patterns à adopter"],
    "colorDirection": "direction artistique couleurs",
    "typographyDirection": "direction artistique typo"
  }
}
`,
}
```

### Étape 4 — Architecture

```typescript
export const architecturePrompt = {
  system: `Tu es un architecte d'information et expert UX.
Tu conçois des structures de sites optimisées pour la conversion et le SEO.
Réponds uniquement avec un JSON valide.`,

  user: (analysis: string, inspiration: string) => `
## Contexte

Analyse du site source :
${analysis}

Insights des inspirations :
${inspiration}

## Architecture demandée

{
  "sitemap": [
    {
      "path": "/",
      "slug": "home",
      "title": "Accueil",
      "purpose": "string",
      "sections": [
        {
          "type": "hero" | "features" | "testimonials" | "cta" | "faq" | "gallery" | "contact" | "content",
          "title": "string nullable",
          "description": "ce que cette section doit accomplir",
          "contentSource": "rewrite" | "preserve" | "new"
        }
      ]
    }
  ],
  "navigation": {
    "header": [{"label": "string", "href": "string"}],
    "footer": [{"label": "string", "href": "string"}]
  },
  "forms": [
    {
      "id": "string",
      "type": "contact" | "newsletter" | "quote" | "booking",
      "fields": [{"name": "string", "type": "string", "required": boolean}],
      "submitAction": "email" | "database" | "webhook"
    }
  ],
  "contentSlots": [
    {
      "id": "string",
      "page": "string",
      "section": "string",
      "type": "text" | "richtext" | "image" | "gallery",
      "currentContent": "string nullable",
      "action": "rewrite" | "preserve"
    }
  ]
}
`,
}
```

### Étape 5 — Design System

```typescript
export const designSystemPrompt = {
  system: `Tu es un designer UI/UX expert en systèmes de design.
Tu crées des design tokens cohérents et modernes.
Réponds uniquement avec un JSON valide contenant des valeurs Tailwind.`,

  user: (inspiration: string, architecture: string) => `
## Contexte

Insights des inspirations :
${inspiration}

Architecture du site :
${architecture}

## Design System demandé

{
  "colors": {
    "primary": {
      "50": "#hex", "100": "#hex", "200": "#hex", "300": "#hex", "400": "#hex",
      "500": "#hex", "600": "#hex", "700": "#hex", "800": "#hex", "900": "#hex"
    },
    "secondary": { ... },
    "accent": { ... },
    "neutral": { ... },
    "success": "#hex",
    "warning": "#hex",
    "error": "#hex"
  },
  "typography": {
    "headings": {
      "fontFamily": "string (Google Font)",
      "fallback": "sans-serif | serif",
      "weights": [400, 500, 600, 700]
    },
    "body": {
      "fontFamily": "string (Google Font)",
      "fallback": "sans-serif",
      "weights": [400, 500]
    }
  },
  "spacing": {
    "baseUnit": 4,
    "scale": [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64]
  },
  "borderRadius": {
    "none": "0",
    "sm": "0.125rem",
    "default": "0.25rem",
    "md": "0.375rem",
    "lg": "0.5rem",
    "xl": "0.75rem",
    "2xl": "1rem",
    "full": "9999px"
  },
  "shadows": {
    "sm": "string",
    "default": "string",
    "md": "string",
    "lg": "string",
    "xl": "string"
  },
  "direction": {
    "mood": "string - description de l'ambiance visuelle",
    "principles": ["principe 1", "principe 2", "principe 3"]
  }
}

IMPORTANT : Les couleurs doivent être des hex valides. Les fonts doivent exister sur Google Fonts.
`,
}
```

---

## Prompts de génération (Claude Code CLI)

### Structure d'un prompt Claude Code

```typescript
const claudeCodePrompt = `
Tu travailles dans le projet : ${projectPath}

## Contexte
${contextFiles.map(f => `### ${f.path}\n${f.content}`).join('\n\n')}

## Artefacts du pipeline
Architecture : ${JSON.stringify(architecture)}
Design System : ${JSON.stringify(designSystem)}

## Tâche
[Description précise de ce qu'il faut faire]

## Contraintes
- TypeScript strict, zéro any
- Server Components par défaut
- Utiliser les tokens du design system
- Tests colocalisés

## Vérification
Après avoir codé :
1. Exécute \`npx tsc --noEmit\` pour vérifier le typage
2. Exécute \`npm test -- --filter [fichier]\` pour les tests
3. Corrige les erreurs avant de terminer
`
```

### Sous-étape 6.1 — Design Tokens

```typescript
export const designTokensPrompt = (designSystem: DesignSystem) => `
Tu travailles dans ${projectPath}

## Tâche
Applique le design system au fichier tailwind.config.ts

## Design System
${JSON.stringify(designSystem, null, 2)}

## Instructions
1. Lis le fichier tailwind.config.ts existant
2. Ajoute les couleurs dans theme.extend.colors
3. Ajoute les fonts dans theme.extend.fontFamily
4. Ajoute les shadows dans theme.extend.boxShadow
5. Vérifie que le fichier est valide TypeScript

## Fichier attendu
Le tailwind.config.ts doit exporter une config Tailwind v4 valide avec tous les tokens.
`
```

### Sous-étape 6.3 — Composant de section

```typescript
export const componentPrompt = (
  sectionType: string,
  block: BlockDefinition,
  designSystem: DesignSystem
) => `
Tu travailles dans ${projectPath}

## Tâche
Génère le composant ${sectionType} dans src/components/sections/${sectionType}.tsx

## Block Payload associé
${JSON.stringify(block, null, 2)}

## Design System
${JSON.stringify(designSystem, null, 2)}

## Instructions
1. Crée un Server Component (pas de "use client")
2. Les props correspondent aux champs du block Payload
3. Utilise les classes Tailwind avec les tokens du design system
4. Le composant doit être responsive (mobile-first)
5. Ajoute les types TypeScript pour les props
6. Crée aussi ${sectionType}.test.tsx avec des tests de rendu

## Exemple de structure
\`\`\`tsx
interface ${sectionType}Props {
  // Props basées sur le block
}

export function ${sectionType}Section(props: ${sectionType}Props) {
  return (
    <section className="...">
      {/* Contenu */}
    </section>
  )
}
\`\`\`

## Vérification
1. npx tsc --noEmit
2. npm test -- --filter ${sectionType}
`
```

---

## Bonnes pratiques

### 1. Température

- **Analyse** (étapes 2-5) : température 0.3-0.5 (cohérence)
- **Génération** (étape 6) : température 0.7-0.8 (créativité contrôlée)

### 2. Max tokens

| Étape | Max tokens recommandé |
|---|---|
| 2 - Analyse | 4000 |
| 3 - Inspiration | 4000 |
| 4 - Architecture | 6000 |
| 5 - Design | 4000 |
| 6.x - Génération | 8000 par sous-étape |

### 3. Retry et validation

```typescript
async function executeWithRetry<T>(
  prompt: () => Promise<string>,
  schema: z.ZodSchema<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await prompt()
    const parsed = extractJSON(response)

    const result = schema.safeParse(parsed)
    if (result.success) return result.data

    // Si échec, ajouter l'erreur au contexte pour le retry
    console.warn(`Validation failed (attempt ${i + 1}):`, result.error)
  }

  throw new Error('Failed to get valid response after retries')
}
```

### 4. Logging des tokens

```typescript
async function callAnthropic(messages: Message[]) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    messages,
    max_tokens: 4000,
  })

  // Logger l'usage
  await logTokenUsage({
    step: currentStep,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    projectId,
  })

  return response
}
```

---

## Anti-patterns

| Anti-pattern | Problème | Solution |
|---|---|---|
| **Prompt trop long** | Contexte noyé | Extraire uniquement les données nécessaires |
| **Pas d'exemple** | Output imprévisible | Toujours inclure 1-2 exemples |
| **Instructions vagues** | Résultat aléatoire | Spécifier exactement le format attendu |
| **Ignorer les erreurs** | Artefacts invalides | Validation Zod + retry |
| **Tout en un seul prompt** | Timeout, incohérence | Découper en sous-étapes |
