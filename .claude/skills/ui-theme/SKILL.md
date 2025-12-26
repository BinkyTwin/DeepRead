---
name: ui-theme
description: Design system et palette de couleurs du projet. Utiliser pour tout styling, creation de composants UI, ou quand des couleurs sont mentionnees.
allowed-tools: Read, Grep, Glob
---

# UI Theme Skill

## Regle Absolue

**INTERDIT** d'utiliser des couleurs hors des tokens definis.

### INTERDIT
```jsx
<div className="bg-purple-500">        // Couleur arbitraire
<div className="bg-blue-600">          // Couleur arbitraire
<div style={{ color: '#abc123' }}>     // Hex direct
<div className="text-violet-400">      // Violet = interdit
```

### AUTORISE
```jsx
<div className="bg-background">        // Token
<div className="bg-primary">           // Token
<div className="text-foreground">      // Token
<div className="border-border">        // Token
```

## Palette Dark Mode

| Token | Valeur | Usage |
|-------|--------|-------|
| `--background` | #0f1419 | Fond principal |
| `--foreground` | #e7e9ea | Texte principal |
| `--card` | #16202a | Cartes, panels |
| `--primary` | #f97316 | Boutons, accents (orange) |
| `--secondary` | #1d2d3d | Elements secondaires |
| `--muted` | #2d3d4d | Fonds subtils |
| `--muted-foreground` | #8b98a5 | Texte secondaire |
| `--border` | #2f3336 | Bordures |
| `--destructive` | #ef4444 | Erreurs |

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

## Configuration Tailwind

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        border: 'var(--border)',
        destructive: 'var(--destructive)',
      }
    }
  }
}
```

## CSS Variables (globals.css)

```css
:root {
  --background: #0f1419;
  --foreground: #e7e9ea;
  --card: #16202a;
  --primary: #f97316;
  --secondary: #1d2d3d;
  --muted: #2d3d4d;
  --muted-foreground: #8b98a5;
  --border: #2f3336;
  --destructive: #ef4444;
}
```

## Highlights (Exception pour surlignage)

```css
.highlight-yellow { background-color: rgba(255, 235, 59, 0.35); }
.highlight-green  { background-color: rgba(76, 175, 80, 0.35); }
.highlight-blue   { background-color: rgba(33, 150, 243, 0.35); }
.highlight-red    { background-color: rgba(244, 67, 54, 0.35); }
.highlight-orange { background-color: rgba(255, 152, 0, 0.35); }
```

## Verification Avant Commit

Rechercher dans le code :
```bash
grep -r "purple\|violet\|blue-[0-9]" --include="*.jsx" --include="*.tsx"
grep -r "#[0-9a-f]\{3,6\}" --include="*.jsx" --include="*.tsx"
```

Si resultats -> corriger avant commit.

## Composants UI Standards

### Bouton Principal
```jsx
<button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
  Action
</button>
```

### Card
```jsx
<div className="bg-card border border-border rounded-lg p-4">
  <h3 className="text-foreground font-semibold">Titre</h3>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Input
```jsx
<input
  className="bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
  placeholder="Entrer du texte..."
/>
```
