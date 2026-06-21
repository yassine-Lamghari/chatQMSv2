# Architecture

## Vue d'ensemble

QMS Chatbot v2 suit une architecture **client-serveur à deux niveaux** avec une base vectorielle dédiée.

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                 │
│  / (Chat)  /admin  /audit  /pfmea  /search  /logs       │
│            React 19 · TypeScript · TailwindCSS           │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP REST (JSON)
                        │ Authorization: Bearer <JWT>
┌───────────────────────▼─────────────────────────────────┐
│                   BACKEND (FastAPI)                      │
│                                                          │
│  main.py — 35+ endpoints REST                            │
│  ├── auth.py          JWT create/decode                  │
│  ├── crypto_utils.py  Fernet encrypt/decrypt             │
│  ├── database.py      SQLAlchemy ORM (SQLite)            │
│  ├── rag.py           Pipeline RAG                       │
│  ├── llm_rag.py       Synthèse LLM multi-provider        │
│  └── services_qms.py  Logique métier Audit/PFMEA         │
│                                                          │
│  Middleware : CORS · Rate Limiting (slowapi)              │
└────┬──────────────────┬────────────────┬────────────────┘
     │                  │                │
┌────▼────┐    ┌────────▼──────┐  ┌──────▼──────────────┐
│ SQLite  │    │   ChromaDB    │  │  LLM Provider       │
│ (ORM)   │    │ (vecteurs 384)│  │  Groq/Gemini/       │
│ Users   │    │ chunks+images │  │  DeepSeek/Ollama    │
│ Docs    │    │               │  │  temp=0.15          │
│ Logs    │    │  BM25 (custom)│  │                     │
└─────────┘    └───────────────┘  └─────────────────────┘
```

## Stack technique

| Couche | Technologie | Version | Rôle |
|---|---|---|---|
| **Frontend** | Next.js (App Router) | 16.2.4 | Interface utilisateur SPA |
| **UI** | React | 19.2.4 | Bibliothèque de composants |
| **Styles** | TailwindCSS | 4.x | Styling utilitaire |
| **Typage** | TypeScript | 5.x | Sécurité de type |
| **Backend** | FastAPI | latest | Framework API REST async |
| **Serveur** | Uvicorn | latest | Serveur ASGI |
| **ORM** | SQLAlchemy | 2.0 | Accès base de données |
| **BDD** | SQLite | 3.x | Données applicatives |
| **Vecteurs** | ChromaDB | latest | Base vectorielle persistante |
| **Embeddings** | sentence-transformers | latest | Vectorisation multilingue |
| **Auth** | python-jose (JWT) | latest | Authentification |
| **Chiffrement** | cryptography (Fernet) | latest | Protection clés API |
| **Rate limit** | slowapi | latest | Protection abus |

## Flux de traitement — Chat RAG

```{mermaid}
sequenceDiagram
    participant U as Utilisateur
    participant FE as Frontend
    participant API as FastAPI
    participant RAG as Pipeline RAG
    participant VDB as ChromaDB
    participant LLM as LLM Provider
    participant DB as SQLite

    U->>FE: Question en langage naturel
    FE->>API: POST /api/chat {query, filters, ...}
    API->>RAG: search_similar_chunks(query, k=16)
    RAG->>VDB: similarity_search (cosinus)
    RAG->>VDB: BM25 keyword search
    RAG-->>API: top-k passages + distances
    API->>API: Filtrage (criticité, date, seuils)
    API->>LLM: synthesize_from_context(context)
    LLM-->>API: JSON {summary, bullets, details}
    API->>DB: log_activity()
    API-->>FE: {summary, sources, confidence, images}
    FE-->>U: Réponse formatée + sources cliquables
```

## Flux d'ingestion d'un document

```{mermaid}
sequenceDiagram
    participant A as Admin
    participant API as FastAPI
    participant BG as BackgroundTask
    participant RAG as rag.py
    participant VDB as ChromaDB
    participant DB as SQLite

    A->>API: POST /api/documents (multipart)
    API->>DB: INSERT DocumentMetadata
    API->>BG: add_task(ingest_document)
    API-->>A: 200 OK {doc_id, ...}
    BG->>RAG: ingest_document(file, doc_id, meta)
    RAG->>RAG: Load + Split chunks (900 chars, overlap 220)
    RAG->>VDB: add_documents(chunks)
    RAG->>RAG: extract_images_from_pdf() [PDF uniquement]
    RAG->>VDB: add_documents(image_chunks)
```

## Structure des fichiers

```
chat/
├── .readthedocs.yaml          ← Config ReadTheDocs
├── .gitignore
├── start_servers.bat          ← Lancement Windows
├── qms_chatbot.db             ← SQLite (racine, copie de dev)
│
├── backend/                   ← API FastAPI (Python)
│   ├── main.py                ← 1641 lignes, 35+ endpoints
│   ├── rag.py                 ← Pipeline RAG + recherche hybride
│   ├── llm_rag.py             ← Synthèse LLM multi-provider
│   ├── database.py            ← Modèles SQLAlchemy
│   ├── auth.py                ← JWT helpers
│   ├── crypto_utils.py        ← Fernet encrypt/decrypt
│   ├── services_qms.py        ← Audit + PFMEA logique métier
│   ├── requirements.txt       ← Dépendances Python
│   ├── .env                   ← Variables d'environnement (non versionné)
│   ├── .env.example           ← Template .env
│   ├── chroma_db/             ← Base vectorielle persistante
│   ├── uploads/               ← Documents + images extraites
│   └── qms_chatbot.db         ← Base SQLite principale
│
├── frontend/                  ← Application Next.js 16
│   ├── package.json
│   ├── next.config.ts
│   └── src/app/
│       ├── page.tsx           ← Chat (page principale, 46KB)
│       ├── admin/             ← Panneau d'administration
│       ├── audit/             ← Module audit
│       ├── pfmea/             ← Module PFMEA
│       ├── search/            ← Recherche documentaire
│       ├── logs/              ← Journal d'activité
│       ├── login/             ← Authentification
│       ├── globals.css        ← Design system (28KB)
│       └── components/        ← Composants réutilisables
│
└── docs/                      ← Documentation Sphinx (ReadTheDocs)
    ├── conf.py
    ├── index.rst
    └── *.md                   ← Pages de documentation
```
