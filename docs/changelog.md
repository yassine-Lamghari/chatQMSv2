# Changelog

## Version 2.0.0 — Juin 2026

### Nouvelles fonctionnalités

- **Pipeline RAG hybride** : Recherche combinée BM25 + vectorielle + Reciprocal Rank Fusion (RRF)
- **Multi-provider LLM** : Support Groq, Gemini, DeepSeek et Ollama (local)
- **Module Audit** : Génération de checklists ISO 9001 / IATF 16949 contextualisées par processus
- **Module PFMEA** : Génération de tableaux AMDEC Process enrichis par RAG + LLM
- **Export multi-format** : Excel (openpyxl), PDF (fpdf2), Word (python-docx)
- **Authentification JWT** : Tokens signés HS256 avec expiration configurable
- **Chiffrement des clés API** : Fernet AES-128-CBC + HMAC-SHA256
- **Sessions de chat persistantes** : Sauvegarde en SQLite
- **Score de confiance** : Calcul basé sur pertinence, couverture et fraîcheur
- **Extraction d'images PDF** : Via PyMuPDF, indexation des figures dans ChromaDB
- **Recherche avancée** : Filtres par date, criticité, propriétaire, site
- **Audit checklist interactive** : Sauvegarde et historique des résultats d'audit
- **Tableau de bord statistiques** : KPIs, distribution confiance, top documents
- **Multi-langue** : 3 modes (document_language, en_only, fr_with_en_sources)
- **Multi-site** : Isolation des données par champ `site`
- **Rate limiting** : Protection anti-abus via slowapi
- **SharePoint stub** : Endpoints de configuration et synchronisation (intégration partielle)

### Stack technique

- **Backend :** FastAPI + Uvicorn + SQLAlchemy 2.0 + SQLite
- **Frontend :** Next.js 16.2.4 + React 19 + TypeScript + TailwindCSS 4
- **Vecteurs :** ChromaDB + sentence-transformers (384 dim, 50+ langues)
- **Sécurité :** python-jose (JWT) + bcrypt + cryptography (Fernet) + slowapi

---

## Version 1.0.0 — Prototype initial

- Chat documentaire basique
- Indexation PDF/DOCX
- Authentification simple
- Interface Next.js minimaliste
