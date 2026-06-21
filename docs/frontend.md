# Frontend — Structure & Guide

## Stack technique

| Technologie | Version | Rôle |
|---|---|---|
| **Next.js** | 16.2.4 | Framework React (App Router) |
| **React** | 19.2.4 | Bibliothèque UI |
| **TypeScript** | 5.x | Typage statique |
| **TailwindCSS** | 4.x | Styling utilitaire |

## Structure des pages

| Route | Description |
|---|---|
| `/` | Interface de chat principale (page.tsx — 46KB) |
| `/login` | Formulaire de connexion |
| `/admin` | Panneau d'administration |
| `/audit` | Module audit ISO/IATF |
| `/pfmea` | Module PFMEA/AMDEC |
| `/search` | Recherche documentaire avancée |
| `/logs` | Journal d'activité (admin) |

## Communication avec le backend

```typescript
// Pattern standard d'appel API
const response = await fetch('http://localhost:8000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(payload)
});
const data = await response.json();
```

Le token JWT est conservé côté client et envoyé dans chaque requête protégée.

## Configuration Next.js

**`next.config.ts` :** Configuration Turbopack (bundler Next.js 16)

**`globals.css` (28KB) :** Système de design complet :
- Variables CSS (couleurs, spacing, typography)
- Animations et micro-interactions
- Composants UI stylisés
- Support mode sombre

## Scripts npm

```bash
npm run dev    # Serveur de développement (http://localhost:3000)
npm run build  # Build production
npm run start  # Serveur production
npm run lint   # ESLint
```
