# 🛠️ Guide Complet : Configuration Claude Code pour Paper Reader

## Vue d'ensemble de l'écosystème Claude Code

Avant de configurer, voici comment les différents éléments s'articulent :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLAUDE CODE ECOSYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CLAUDE.md ─────────────── Contexte projet (toujours chargé)                │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    EXTENSIONS CLAUDE CODE                            │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  SKILLS ────────── Auto-invoquées par Claude quand pertinent        │    │
│  │  (model-invoked)   Dossiers avec SKILL.md + fichiers support        │    │
│  │                    Ex: pdf-extraction, rag-citations                 │    │
│  │                                                                      │    │
│  │  SLASH COMMANDS ── Invoquées manuellement par toi (/command)        │    │
│  │  (user-invoked)    Fichiers .md simples                             │    │
│  │                    Ex: /test, /deploy, /fix-issue                   │    │
│  │                                                                      │    │
│  │  SUBAGENTS ─────── Agents spécialisés avec contexte isolé           │    │
│  │                    Peuvent tourner en parallèle                     │    │
│  │                    Ex: code-reviewer, debugger, researcher          │    │
│  │                                                                      │    │
│  │  HOOKS ─────────── Actions automatiques sur événements              │    │
│  │                    Ex: formater après edit, valider avant commit    │    │
│  │                                                                      │    │
│  │  MCP SERVERS ───── Connexion à outils externes                      │    │
│  │                    Ex: GitHub, Supabase, Browser                    │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quand utiliser quoi ?

| Besoin | Outil | Exemple |
|--------|-------|---------|
| Conventions toujours appliquées | CLAUDE.md | "Utilise TypeScript strict" |
| Expertise auto-activée | Skill | Extraction PDF, RAG citations |
| Workflow manuel répétable | Slash Command | `/test`, `/deploy`, `/new-component` |
| Tâche isolée/parallèle | Subagent | Code review, recherche documentation |
| Action automatique | Hook | Prettier après edit, lint avant commit |
| Outil externe | MCP Server | GitHub, Supabase, Browser |

---

## 📁 Structure des Fichiers de Configuration

```
paper-reader/
├── CLAUDE.md                      # Contexte projet principal
├── CLAUDE.local.md                # (Optionnel) Ton contexte perso (gitignore)
│
├── .claude/
│   ├── settings.json              # Paramètres projet
│   │
│   ├── commands/                  # Slash commands projet
│   │   ├── new-component.md       # /project:new-component
│   │   ├── test.md                # /project:test
│   │   ├── deploy.md              # /project:deploy
│   │   └── fix-issue.md           # /project:fix-issue
│   │
│   ├── agents/                    # Subagents projet
│   │   ├── pdf-expert.md
│   │   ├── ui-designer.md
│   │   └── code-reviewer.md
│   │
│   └── skills/                    # Skills projet
│       ├── pdf-extraction/
│       │   ├── SKILL.md
│       │   └── examples/
│       ├── rag-citations/
│       │   ├── SKILL.md
│       │   └── prompts/
│       ├── supabase/
│       │   └── SKILL.md
│       └── ui-theme/
│           └── SKILL.md
│
├── .mcp.json                      # MCP servers partagés (git)
│
└── ...
```

### Fichiers dans `~/.claude/` (global, perso)

```
~/.claude/
├── CLAUDE.md                      # Ton contexte global
├── settings.json                  # Paramètres globaux
├── commands/                      # Tes commandes perso
│   └── research.md                # /user:research
└── agents/                        # Tes agents perso
    └── general-helper.md
```

---

## 1️⃣ CLAUDE.md - Le Fichier Essentiel

C'est le fichier le plus important. Claude le lit **à chaque conversation**.

### CLAUDE.md pour Paper Reader

```markdown
# CLAUDE.md - Paper Reader

## Description
Application de lecture de papers académiques avec citations ultra-fiables.
Objectif : importer un PDF, le lire, surligner, discuter, traduire, avec des citations précises (page + offsets).

## Stack Technique
- **Frontend**: Next.js 14 (App Router), TypeScript strict, TailwindCSS, shadcn/ui, pdf.js
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + Storage)
- **LLM**: OpenRouter (DeepSeek gratuit) ou LM Studio (local)

## Commandes Essentielles

```bash
npm run dev          # Serveur dev (port 3000)
npm run build        # Build production
npm run lint         # ESLint
npm run typecheck    # Vérification TypeScript
npm run db:types     # Régénérer types Supabase
npm run db:push      # Pousser migrations
```

## Structure Projet

```
app/                 # Routes Next.js App Router
  api/               # API Routes
    llm/             # Router LLM unifié
    papers/          # CRUD papers
    chat/            # Chat avec citations
components/
  pdf/               # Viewer, highlights, text layer
  chat/              # Interface chat, messages
  ui/                # shadcn/ui components
lib/
  pdf-parser.ts      # Extraction texte avec positions
  supabase/          # Clients Supabase
  highlight.ts       # Calcul offsets/rects
hooks/
types/
```

## Conventions de Code

### TypeScript
- **TOUJOURS** TypeScript strict, jamais `any`
- Interfaces pour les props, types pour les unions
- Imports absolus avec `@/` prefix

### Composants React
- Composants fonctionnels uniquement
- Nommage PascalCase
- Props destructurées avec types

```typescript
interface ComponentProps {
  required: string;
  optional?: number;
  onAction?: (value: string) => void;
}

export function Component({ required, optional = 42, onAction }: ComponentProps) {
  // ...
}
```

### Style (TRÈS IMPORTANT)
- **UNIQUEMENT** les tokens CSS définis dans globals.css
- **INTERDIT**: bg-purple-*, bg-violet-*, #random-hex, couleurs arbitraires
- **AUTORISÉ**: bg-background, bg-primary, text-foreground, border-border, etc.
- Palette: dark + accent orange-rouge (pas de violet!)

## Citations - Règle Critique

Les citations sont la feature principale. Format obligatoire :

```typescript
interface Citation {
  page: number;      // 1-indexed
  start: number;     // Offset dans text_content de la page
  end: number;       // Offset fin
  quote: string;     // Extrait pour vérification (max 100 chars)
}
```

**TOUJOURS** :
1. Valider que start/end sont dans les limites du texte
2. Stocker les text_items avec positions normalisées (0-1)
3. Utiliser offsetsToRects() pour convertir en rectangles

## Erreurs Fréquentes à Éviter

1. ❌ Ne pas utiliser `any` en TypeScript
2. ❌ Ne pas utiliser de couleurs hors tokens
3. ❌ Ne pas faire confiance au LLM pour les positions sans validation
4. ❌ Ne pas oublier le --break-system-packages avec pip
5. ❌ Ne pas hardcoder les URLs d'API

## Workflow Git

- Branches: `feature/nom-feature`, `fix/description`
- Commits: messages en anglais, format conventionnel
- PR: review obligatoire avant merge

## Variables d'Environnement

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
LLM_PROVIDER=openrouter  # ou lmstudio
LMSTUDIO_URL=http://localhost:1234/v1
OPENROUTER_API_KEY=
OPENROUTER_MODEL=nex-agi/deepseek-v3.1-nex-n1:free
```

## Tests

- Tester chaque feature avant de passer à la suivante
- Priorité aux tests d'intégration pour le PDF parsing
- Mock les appels LLM dans les tests

## Quand tu es bloqué

1. Lis la skill pertinente dans `.claude/skills/`
2. Vérifie les types Supabase générés
3. Lance `npm run typecheck` pour voir les erreurs
```

### Astuces pour CLAUDE.md

1. **Garder concis** : Claude lit tout à chaque fois, évite les romans
2. **Mettre les commandes en premier** : ce qu'il utilisera le plus souvent
3. **Emphase sur l'important** : "TRÈS IMPORTANT", "TOUJOURS", "JAMAIS"
4. **Exemples de code** : plus efficace que des descriptions
5. **Itérer** : affine en fonction de ce qui marche ou pas

---

## 2️⃣ Skills - Expertise Auto-Activée

Les Skills sont des dossiers avec un `SKILL.md` que Claude charge automatiquement quand pertinent.

### Skill 1: pdf-extraction

```
.claude/skills/pdf-extraction/
├── SKILL.md
├── text-items-format.md
└── examples/
    └── sample-extraction.ts
```

**SKILL.md** :
```markdown
---
name: pdf-extraction
description: Extraction de texte PDF avec positions précises pour citations. Utiliser quand on travaille avec l'ingestion de PDF, l'extraction de texte, ou le parsing de documents académiques.
---

# PDF Extraction Skill

## Objectif
Extraire le texte d'un PDF avec les positions exactes de chaque élément pour permettre des citations fiables.

## Dépendances
- pdfjs-dist (version Node, pas browser)
- Version legacy pour éviter les problèmes de worker

## Installation
```bash
npm install pdfjs-dist
```

## Processus d'Extraction

### 1. Chargement du PDF
```typescript
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Désactiver le worker pour Node.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
```

### 2. Extraction par page
Pour chaque page :
1. `page.getTextContent()` → items avec `str`, `transform`
2. Normaliser les coordonnées (0-1) par rapport au viewport
3. Construire `text_content` et `text_items`

### 3. Format de sortie obligatoire
```typescript
interface TextItem {
  str: string;
  x: number;           // 0-1 normalisé
  y: number;           // 0-1 normalisé
  width: number;       // 0-1 normalisé
  height: number;      // 0-1 normalisé
  startOffset: number; // Position dans text_content
  endOffset: number;
}

interface PageData {
  pageNumber: number;
  textContent: string;
  textItems: TextItem[];
  width: number;
  height: number;
  hasText: boolean;
}
```

### 4. Attention aux coordonnées
- pdf.js utilise l'origine bas-gauche
- Inverser Y : `y = 1 - (transform[5] / viewport.height)`
- Normaliser entre 0 et 1

### 5. Détection pages sans texte (OCR)
Si `textContent.length < 100` → `hasText = false`

## Voir aussi
- [text-items-format.md](text-items-format.md) pour le format détaillé
- [examples/sample-extraction.ts](examples/sample-extraction.ts) pour un exemple complet
```

### Skill 2: rag-citations

```
.claude/skills/rag-citations/
├── SKILL.md
└── prompts/
    └── citation-system-prompt.md
```

**SKILL.md** :
```markdown
---
name: rag-citations
description: Génération de réponses avec citations fiables et validées. Utiliser pour le chat avec documents, les questions-réponses sur papers, ou quand des citations précises sont requises.
---

# RAG Citations Skill

## Objectif
Obtenir des réponses LLM avec citations vérifiables (page + offsets dans le texte).

## Prompt Système Obligatoire

Voir [prompts/citation-system-prompt.md](prompts/citation-system-prompt.md) pour le prompt complet.

Résumé des règles :
1. Répondre UNIQUEMENT en JSON
2. Format: `{"answer": "...", "citations": [...]}`
3. Citations: `{"page": N, "start": X, "end": Y, "quote": "..."}`
4. Ne citer QUE le contexte fourni

## Validation des Citations (Obligatoire)

```typescript
async function validateCitations(
  supabase: any,
  paperId: string,
  citations: any[]
): Promise<ValidatedCitation[]> {
  const validated = [];
  
  for (const citation of citations) {
    // Vérifier les champs requis
    if (!citation.page || citation.start === undefined || citation.end === undefined) {
      continue;
    }
    
    // Récupérer le texte de la page
    const { data: page } = await supabase
      .from('paper_pages')
      .select('text_content')
      .eq('paper_id', paperId)
      .eq('page_number', citation.page)
      .single();
    
    if (!page) continue;
    
    // Vérifier les limites
    if (citation.start < 0 || citation.end > page.text_content.length) {
      continue;
    }
    
    // Extraire le texte réel
    const actualText = page.text_content.slice(citation.start, citation.end);
    
    validated.push({
      ...citation,
      quote: actualText.slice(0, 100),
      verified: true,
    });
  }
  
  return validated;
}
```

## Conversion Offsets → Rectangles

```typescript
function offsetsToRects(
  startOffset: number,
  endOffset: number,
  textItems: TextItem[]
): HighlightRect[] {
  const rects: HighlightRect[] = [];
  
  for (const item of textItems) {
    if (item.endOffset <= startOffset) continue;
    if (item.startOffset >= endOffset) break;
    
    rects.push({
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    });
  }
  
  return mergeAdjacentRects(rects);
}
```

## Gestion des Erreurs LLM

Le LLM peut retourner du JSON invalide. Toujours :
1. Try/catch le parsing JSON
2. Fallback: `{ answer: rawResponse, citations: [] }`
3. Logger l'erreur pour debug
```

### Skill 3: supabase-setup

```markdown
---
name: supabase-setup
description: Configuration et utilisation de Supabase pour le projet. Utiliser pour setup base de données, migrations, storage, ou requêtes Supabase.
---

# Supabase Setup Skill

## Setup Initial

### 1. Créer le projet
1. Aller sur https://supabase.com
2. New Project → choisir région proche
3. Noter le mot de passe DB (tu en auras besoin)

### 2. Récupérer les credentials
Dashboard → Settings → API :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Installer le client
```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Configuration Clients

### Client Browser (components)
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Client Server (API routes)
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // ... set, remove
      },
    }
  );
}
```

## Exécuter le SQL
1. Dashboard → SQL Editor
2. New Query
3. Coller le schéma
4. Run

## Storage Setup
1. Dashboard → Storage
2. New Bucket: "papers"
3. Public: false
4. Pour MVP: désactiver RLS

## Générer les Types
```bash
npx supabase gen types typescript --project-id [ID] > types/supabase.ts
```

Ou ajouter au package.json:
```json
"scripts": {
  "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > types/supabase.ts"
}
```
```

### Skill 4: ui-theme

```markdown
---
name: ui-theme
description: Design system et palette de couleurs du projet. Utiliser pour tout styling, création de composants UI, ou quand des couleurs sont mentionnées.
allowed-tools: Read, Grep, Glob
---

# UI Theme Skill

## Règle Absolue

**INTERDIT** d'utiliser des couleurs hors des tokens définis.

### ❌ INTERDIT
```tsx
<div className="bg-purple-500">        // Couleur arbitraire
<div className="bg-blue-600">          // Couleur arbitraire
<div style={{ color: '#abc123' }}>     // Hex direct
<div className="text-violet-400">      // Violet = interdit
```

### ✅ AUTORISÉ
```tsx
<div className="bg-background">        // Token
<div className="bg-primary">           // Token
<div className="text-foreground">      // Token
<div className="border-border">        // Token
```

## Palette Dark (Alpha-like)

| Token | Valeur HSL | Usage |
|-------|------------|-------|
| `--background` | 220, 20%, 7% | Fond principal |
| `--foreground` | 0, 0%, 95% | Texte principal |
| `--card` | 220, 20%, 10% | Cartes, panels |
| `--primary` | 15, 90%, 55% | Boutons, accents (orange-rouge) |
| `--secondary` | 220, 15%, 18% | Éléments secondaires |
| `--muted` | 220, 15%, 20% | Fonds subtils |
| `--muted-foreground` | 220, 10%, 55% | Texte secondaire |
| `--border` | 220, 15%, 20% | Bordures |
| `--destructive` | 0, 70%, 50% | Erreurs |

## Classes Tailwind Valides

### Fonds
- `bg-background` - Fond page
- `bg-card` - Fond carte
- `bg-primary` - Fond bouton principal
- `bg-secondary` - Fond secondaire
- `bg-muted` - Fond subtil
- `bg-destructive` - Fond erreur

### Texte
- `text-foreground` - Texte principal
- `text-muted-foreground` - Texte secondaire
- `text-primary` - Texte accent
- `text-destructive` - Texte erreur

### Bordures
- `border-border` - Bordure standard
- `border-primary` - Bordure accent

## Highlights (Exception)

Pour les surlignages, utiliser les classes utilitaires définies :
```css
.highlight-yellow { background-color: rgba(255, 235, 59, 0.35); }
.highlight-green  { background-color: rgba(76, 175, 80, 0.35); }
.highlight-blue   { background-color: rgba(33, 150, 243, 0.35); }
.highlight-red    { background-color: rgba(244, 67, 54, 0.35); }
.highlight-orange { background-color: rgba(255, 152, 0, 0.35); }
```

## Vérification Avant Commit

Rechercher dans le code :
```bash
grep -r "purple\|violet\|blue-[0-9]" --include="*.tsx" --include="*.ts"
grep -r "#[0-9a-f]\{3,6\}" --include="*.tsx" --include="*.ts"
```

Si résultats → corriger avant commit.
```

---

## 3️⃣ Slash Commands - Workflows Manuels

Les commandes dans `.claude/commands/` sont invoquées avec `/project:nom`.

### Command: /project:new-component

**Fichier**: `.claude/commands/new-component.md`

```markdown
Crée un nouveau composant React pour le Paper Reader.

## Composant à créer : $ARGUMENTS

## Instructions

1. **Vérifie que le composant n'existe pas déjà**
   - Cherche dans `components/` un fichier similaire

2. **Crée le fichier** dans le bon dossier :
   - `components/pdf/` pour tout ce qui touche au viewer PDF
   - `components/chat/` pour l'interface de chat
   - `components/ui/` pour les composants génériques

3. **Structure obligatoire** :
```typescript
interface [Name]Props {
  // Props requises d'abord
  // Props optionnelles ensuite
  // Callbacks en dernier
}

export function [Name]({ ...props }: [Name]Props) {
  // State
  // Callbacks
  // Effects
  // Early returns
  // Render
}
```

4. **Style** :
   - Utilise UNIQUEMENT les tokens CSS (bg-background, etc.)
   - Utilise les composants shadcn/ui existants
   - Pas de couleurs arbitraires

5. **Après création** :
   - Vérifie avec `npm run typecheck`
   - Ajoute un export dans l'index si pertinent
```

### Command: /project:test

**Fichier**: `.claude/commands/test.md`

```markdown
Lance les tests pour le Paper Reader.

## Cible : $ARGUMENTS

## Instructions

1. **Si $ARGUMENTS est vide** :
   - Lance `npm run test` pour tous les tests

2. **Si $ARGUMENTS spécifie un fichier ou pattern** :
   - Lance `npm run test -- --grep "$ARGUMENTS"`

3. **Analyse les résultats** :
   - Si tests passent : résume brièvement
   - Si tests échouent : 
     a. Identifie les erreurs
     b. Propose des corrections
     c. Demande si tu dois les appliquer

4. **Après correction** :
   - Relance les tests pour vérifier
   - Continue jusqu'à ce que tout passe
```

### Command: /project:fix-issue

**Fichier**: `.claude/commands/fix-issue.md`

```markdown
Corrige un problème GitHub pour le Paper Reader.

## Issue : $ARGUMENTS

## Instructions

1. **Récupère les détails de l'issue** :
   ```bash
   gh issue view $ARGUMENTS
   ```

2. **Analyse le problème** :
   - Identifie les fichiers concernés
   - Comprends le comportement attendu vs actuel

3. **Recherche dans le codebase** :
   - Trouve les fichiers pertinents
   - Lis le code existant

4. **Planifie la solution** :
   - Explique ton approche avant de coder
   - Attends ma confirmation

5. **Implémente** :
   - Fais les changements nécessaires
   - Vérifie avec `npm run typecheck`
   - Lance les tests pertinents

6. **Commit et PR** :
   - Commit avec message : "fix: description (#$ARGUMENTS)"
   - Crée une PR liée à l'issue
```

### Command: /project:deploy

**Fichier**: `.claude/commands/deploy.md`

```markdown
Déploie le Paper Reader sur Vercel.

## Instructions

1. **Vérifications pré-déploiement** :
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

2. **Si erreurs** :
   - Corrige-les
   - Recommence les vérifications

3. **Déploiement** :
   ```bash
   vercel --prod
   ```

4. **Post-déploiement** :
   - Vérifie que l'URL fonctionne
   - Teste les fonctionnalités critiques
   - Rapporte le statut
```

---

## 4️⃣ Subagents - Agents Spécialisés

Les subagents ont leur propre contexte isolé et peuvent tourner en parallèle.

### Agent: pdf-expert

**Fichier**: `.claude/agents/pdf-expert.md`

```markdown
---
name: pdf-expert
description: Expert en parsing et manipulation de PDF. Utiliser PROACTIVEMENT pour tout ce qui touche à l'extraction de texte, les positions, les text items, ou le debugging de problèmes PDF.
tools: Read, Grep, Glob, Bash
model: sonnet
skills: pdf-extraction
---

Tu es un expert en manipulation de PDF avec pdf.js.

## Ton Expertise

1. **Extraction de texte** avec positions exactes
2. **Calcul de coordonnées** et normalisation
3. **Debugging** des problèmes de text layer
4. **Optimisation** du parsing

## Approche

Quand on te demande d'analyser un problème PDF :

1. Lis d'abord `lib/pdf-parser.ts` pour comprendre l'implémentation actuelle
2. Identifie le problème spécifique
3. Propose une solution avec code
4. Explique les pièges potentiels

## Règles

- Toujours travailler avec des coordonnées normalisées (0-1)
- Ne jamais oublier l'inversion de l'axe Y
- Valider les offsets avant de les utiliser
- Tester avec différents types de PDF
```

### Agent: ui-designer

**Fichier**: `.claude/agents/ui-designer.md`

```markdown
---
name: ui-designer
description: Designer UI spécialisé dans les interfaces sombres et les viewers de documents. Utiliser pour créer des composants visuels, améliorer l'UX, ou résoudre des problèmes de style.
tools: Read, Write, Edit, Bash
model: sonnet
skills: ui-theme
---

Tu es un designer UI expert en interfaces dark mode pour applications de lecture.

## Ton Style

- Dark mode élégant (fond très sombre, texte clair)
- Accent orange-rouge (pas de violet!)
- Minimaliste et fonctionnel
- Focus sur la lisibilité

## Contraintes Strictes

Tu dois UNIQUEMENT utiliser les tokens CSS définis :
- bg-background, bg-card, bg-primary, bg-secondary, bg-muted
- text-foreground, text-muted-foreground, text-primary
- border-border

INTERDIT : purple, violet, blue-500, couleurs hex directes

## Approche

1. Vérifie d'abord les composants shadcn/ui disponibles
2. Réutilise les patterns existants du projet
3. Assure-toi que le composant est responsive
4. Pense à l'accessibilité (contraste, focus states)
```

### Agent: code-reviewer

**Fichier**: `.claude/agents/code-reviewer.md`

```markdown
---
name: code-reviewer
description: Revieweur de code senior. Utiliser après avoir écrit du code pour vérifier la qualité, la sécurité, et les bonnes pratiques.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Tu es un revieweur de code senior spécialisé en TypeScript et React.

## Checklist de Review

### TypeScript
- [ ] Pas de `any`
- [ ] Types explicites pour les fonctions publiques
- [ ] Interfaces bien nommées

### React
- [ ] Composants fonctionnels
- [ ] Props destructurées
- [ ] useCallback pour les handlers passés en props
- [ ] useMemo pour les calculs coûteux

### Sécurité
- [ ] Pas de secrets hardcodés
- [ ] Validation des inputs utilisateur
- [ ] Sanitization des données avant affichage

### Style
- [ ] Uniquement tokens CSS
- [ ] Pas de couleurs arbitraires
- [ ] Cohérence avec le design system

### Citations (spécifique projet)
- [ ] Offsets validés avant utilisation
- [ ] Pas de confiance aveugle au LLM
- [ ] Fallback en cas d'erreur

## Format de Feedback

Organise ton feedback par priorité :
1. 🔴 CRITIQUE - Doit être corrigé
2. 🟠 IMPORTANT - Devrait être corrigé
3. 🟡 SUGGESTION - Amélioration optionnelle
```

---

## 5️⃣ Hooks - Automatisation

Les hooks exécutent des commandes automatiquement sur certains événements.

### Configuration dans `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | { read file_path; if echo \"$file_path\" | grep -qE '\\.(ts|tsx)$'; then npx prettier --write \"$file_path\" 2>/dev/null; fi; }"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command' | { read cmd; if echo \"$cmd\" | grep -q 'rm -rf /'; then echo 'BLOCKED: Dangerous command' >&2; exit 2; fi; }"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$(date '+%Y-%m-%d %H:%M'): Session ended\" >> ~/.claude/paper-reader-log.txt"
          }
        ]
      }
    ]
  },
  "permissions": {
    "allow": [
      "Edit",
      "Write",
      "Bash(npm run:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(npx prettier:*)"
    ]
  }
}
```

### Hooks Recommandés pour Paper Reader

| Event | Action | Pourquoi |
|-------|--------|----------|
| `PostToolUse(Edit\|Write)` | Prettier sur .ts/.tsx | Code toujours formaté |
| `PreToolUse(Bash)` | Bloquer commandes dangereuses | Sécurité |
| `PostToolUse(Edit)` | Typecheck sur fichier modifié | Erreurs détectées tôt |
| `Stop` | Logger la session | Traçabilité |

---

## 6️⃣ MCP Servers - Outils Externes

### Configuration `.mcp.json` (projet, partagé via git)

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    }
  }
}
```

### MCPs Utiles pour Paper Reader

| MCP | Utilité | Installation |
|-----|---------|--------------|
| **Supabase** | Requêtes DB directes | `claude mcp add supabase ...` |
| **Puppeteer** | Screenshots pour tests visuels | `claude mcp add puppeteer ...` |
| **GitHub** | Issues, PRs | `claude mcp add --transport http github https://api.githubcopilot.com/mcp/` |

### Ajouter un MCP

```bash
# MCP HTTP (recommandé pour services cloud)
claude mcp add --transport http github https://api.githubcopilot.com/mcp/

# MCP stdio (pour outils locaux)
claude mcp add --transport stdio puppeteer -- npx -y @anthropic/mcp-puppeteer

# Lister les MCPs configurés
claude mcp list

# Voir le statut dans Claude Code
/mcp
```

---

## 7️⃣ Premier Prompt à Envoyer à Claude Code

Voici exactement ce que tu dois dire à Claude Code pour initialiser le projet :

```
Je veux créer un Paper Reader avec citations fiables. 

## Ce que je veux
- Importer des PDF de papers académiques  
- Les lire dans un viewer avec text layer
- Surligner des passages
- Discuter avec le paper (chat)
- Traduction
- Citations ultra-précises (page + offsets dans le texte)

## Stack
- Next.js 14 (App Router), TypeScript strict
- TailwindCSS + shadcn/ui  
- Supabase (PostgreSQL + Storage)
- pdf.js pour le viewer
- LLM via OpenRouter (modèle gratuit) ou LM Studio (local)

## Design
- Dark mode obligatoire
- Accent orange-rouge (PAS de violet)
- Style "alpha-like" sobre

## Configuration Claude Code
J'ai préparé les fichiers de config. Pour ce projet, je veux que tu :

1. Crées le CLAUDE.md à la racine avec les conventions
2. Crées les Skills dans .claude/skills/ :
   - pdf-extraction (parsing PDF avec positions)
   - rag-citations (génération réponses avec citations)
   - supabase-setup (configuration Supabase)
   - ui-theme (palette et règles de style)
3. Crées les Slash Commands dans .claude/commands/ :
   - new-component.md
   - test.md  
   - fix-issue.md
4. Crées les Subagents dans .claude/agents/ :
   - pdf-expert.md
   - ui-designer.md
   - code-reviewer.md
5. Configures le .claude/settings.json avec :
   - Hook PostToolUse pour Prettier sur .ts/.tsx
   - Permissions pour npm run, git commit, git push

Commence par la structure de fichiers, puis on initialisera le projet Next.js.

Étape par étape, confirme chaque action.
```

---

## 🎮 Workflow Quotidien

### Démarrer une session

```bash
cd paper-reader
claude
```

### Commandes utiles en session

```bash
# Navigation
/clear              # Reset le contexte (utiliser souvent!)
/model              # Changer de modèle (opus pour tâches complexes)
/compact            # Compresser l'historique

# Customisation  
/agents             # Gérer les subagents
/hooks              # Configurer les hooks
/mcp                # Gérer les MCP servers
/permissions        # Gérer les autorisations

# Tes commandes custom
/project:test       # Lancer les tests
/project:new-component ChatMessage   # Créer un composant
/project:fix-issue 123              # Fixer une issue
```

### Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Escape` | Interrompre Claude |
| `Escape` x2 | Revenir en arrière dans l'historique |
| `Shift+Tab` | Toggle auto-accept mode |
| `#` | Ajouter une instruction au CLAUDE.md |
| `@` | Référencer un fichier |
| `/` | Commandes slash |
| `!` | Exécuter commande shell directement |

### Pattern "Explore, Plan, Code, Commit"

```
1. > Lis les fichiers liés au PDF viewer et ne code pas encore

2. > Réfléchis (think hard) à comment implémenter le surlignage 
     avec coordonnées normalisées. Fais un plan.

3. > (après validation du plan)
     Implémente la solution. Vérifie avec typecheck.

4. > Commit avec message descriptif et crée une PR
```

---

## ✅ Checklist Avant de Commencer

- [ ] Claude Code installé : `npm i -g @anthropic-ai/claude-code`
- [ ] Authentifié : `claude` (première fois)
- [ ] Dossier projet créé
- [ ] Git initialisé : `git init`
- [ ] CLAUDE.md créé à la racine
- [ ] Structure `.claude/` créée
- [ ] Variables d'environnement configurées

---

## 🆘 Dépannage

### Claude n'utilise pas ma Skill
1. Vérifie que le `description` est spécifique
2. Vérifie le chemin : `.claude/skills/[nom]/SKILL.md`
3. Lance avec `claude --debug` pour voir les erreurs

### Claude ignore mes conventions
1. Vérifie que CLAUDE.md est à la racine
2. Ajoute de l'emphase : "TOUJOURS", "JAMAIS", "IMPORTANT"
3. Utilise `/clear` pour reset le contexte pollué

### Les hooks ne se déclenchent pas
1. Vérifie la syntaxe JSON dans `.claude/settings.json`
2. Vérifie le matcher (regex)
3. Lance avec `claude --debug`

### MCP ne se connecte pas
1. Vérifie avec `/mcp` le statut
2. Vérifie les variables d'environnement
3. Lance avec `--mcp-debug`

---

**Maintenant tu as tout ce qu'il faut pour configurer Claude Code comme un pro ! 🚀**


