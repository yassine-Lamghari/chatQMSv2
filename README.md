# QMS Chatbot — Système RAG pour la Gestion Documentaire Qualité

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![ISO 9001](https://img.shields.io/badge/ISO-9001%3A2015-orange.svg)](https://www.iso.org/iso-9001-quality-management.html)

## Description

**QMS Chatbot** est un système de **Retrieval-Augmented Generation (RAG)** dédié à la gestion documentaire qualité (QMS — Quality Management System). Il permet aux utilisateurs d'interroger en langage naturel une base documentaire qualité (procédures ISO, checklists d'audit, plans de contrôle, formations...) et d'obtenir des réponses précises ancrées dans les documents, avec citations des sources.

### Fonctionnalités principales

- 🔍 **Recherche hybride** : Vector (cosinus) + BM25 + Reciprocal Rank Fusion (RRF)
- 🤖 **Multi-LLM** : Groq, Gemini, DeepSeek, Ollama (local)
- 🛡️ **Anti-hallucination** : Prompt strict + flag `answer_in_context` + seuils de pertinence
- 📄 **Multi-format** : PDF, Word, Excel, PowerPoint, Images (PNG/JPG)
- 🔐 **Contrôle d'accès** : JWT, rôles admin/user, criticité des documents, multi-tenant
- 📊 **PFMEA/AMDEC** : Génération assistée par LLM depuis les documents
- 📋 **Audit qualité** : Checklist interactive par clause ISO 9001
- 🌍 **Bilingue** : Français / Anglais

---

## Architecture

```
chat/
├── backend/                    # API FastAPI (Python 3.10+)
│   ├── main.py                 # Routes API, auth JWT, logique métier
│   ├── rag.py                  # Retrieval hybride (Vector + BM25 + RRF)
│   ├── llm_rag.py              # Synthèse LLM + anti-hallucination
│   ├── database.py             # Modèles SQLAlchemy (SQLite)
│   ├── auth.py                 # JWT encode/decode
│   ├── crypto_utils.py         # Chiffrement Fernet des clés API
│   ├── chroma_db/              # Vecteurs ChromaDB (persistés)
│   ├── uploads/                # Documents uploadés
│   └── requirements.txt        # Dépendances Python
├── frontend/                   # Next.js 16 (TypeScript)
│   └── src/                    # Code source frontend
├── docs_test/                  # Corpus de documents de test
│   ├── procedure_qualite_ISO9001.pdf
│   ├── checklist_audit_ISO9001.docx
│   ├── plan_controle_qualite.xlsx
│   ├── formation_qualite_ISO9001.pptx
│   └── schema_processus_qualite.png
├── evaluation/                 # Évaluation du système RAG
│   ├── qa_evaluation.csv       # Jeu de 18 questions-réponses
│   ├── evaluate_retrieval.py   # Script de calcul des métriques
│   └── retrieval_metrics.md    # Documentation des métriques
├── docs/                       # Documentation technique
│   ├── anti_hallucination.md   # Mécanismes anti-hallucination
│   └── access_control.md       # Contrôle des droits d'accès
├── start_servers.bat           # Démarrage Windows (backend + frontend)
└── README.md                   # Ce fichier
```

---

## Prérequis

- **Python 3.10+** avec pip
- **Node.js 18+** avec npm
- Windows 10/11 (le `.bat` est Windows-only ; sur Linux/Mac, utiliser les commandes manuelles)

---

## Installation

### 1. Cloner le projet

```bash
git clone https://github.com/yassine-Lamghari/chatQMSv2.git
cd chatQMSv2
```

### 2. Installer les dépendances backend

```bash
cd backend
python -m venv venv
# Windows :
venv\Scripts\activate
# Linux/Mac :
# source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configurer les variables d'environnement

```bash
cp backend/.env.example backend/.env
```

Éditez `backend/.env` avec vos clés :

```env
# JWT
JWT_SECRET_KEY=<générer avec : python -c "import secrets; print(secrets.token_hex(64))">
JWT_EXPIRE_MINUTES=480

# Chiffrement des clés API
API_KEY_ENCRYPTION_KEY=<générer avec : python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">

# LLM (choisir au moins un provider)
# Groq (gratuit) : https://console.groq.com
# Gemini : https://aistudio.google.com
# Ollama (local) : https://ollama.com
```

### 4. Installer les dépendances frontend

```bash
cd frontend
npm install
```

---

## Démarrage

### Windows (script automatique)

```batch
start_servers.bat
```

Deux fenêtres s'ouvrent :
- **Backend** : http://localhost:8000
- **Frontend** : http://localhost:3000

### Démarrage manuel

**Terminal 1 — Backend :**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 300
```

**Terminal 2 — Frontend :**
```bash
cd frontend
npm run dev
```

---

## Compte Administrateur par Défaut

Un compte admin est créé automatiquement au premier démarrage.
Consultez `backend/seed_admin.py` pour les identifiants par défaut.

> ⚠️ **Changez le mot de passe admin immédiatement après la première connexion.**

---

## Formats de Documents Supportés

| Format | Extension | Méthode d'extraction |
|---|---|---|
| PDF (texte natif) | `.pdf` | PyPDF2 (texte) + PyMuPDF (images) |
| Word | `.docx`, `.doc` | docx2txt |
| Excel | `.xlsx`, `.xls` | openpyxl (par feuille) |
| PowerPoint | `.pptx`, `.ppt` | python-pptx (par slide) |
| Image | `.png`, `.jpg`, `.jpeg` | Indexation descriptive + URL |

> **Note** : Les PDF scannés ne font pas l'objet d'une extraction OCR dans la version actuelle. Les images contenues dans les PDF sont extraites et indexées séparément.

---

## Corpus de Test

Le dossier [`docs_test/`](docs_test/) contient 5 documents représentatifs pour valider le système :

```
docs_test/
├── procedure_qualite_ISO9001.pdf    # PDF texte — 8 sections ISO 9001
├── checklist_audit_ISO9001.docx     # Word — checklist par clause
├── plan_controle_qualite.xlsx       # Excel — plan contrôle + KPI
├── formation_qualite_ISO9001.pptx   # PowerPoint — 6 slides formation
└── schema_processus_qualite.png     # Image — schéma de processus
```

Pour importer ces documents : connectez-vous en admin → Gestion des documents → Importer.

---

## Évaluation du Système RAG

### Jeu de questions-réponses

Le fichier [`evaluation/qa_evaluation.csv`](evaluation/qa_evaluation.csv) contient **18 questions** :
- 16 questions avec document et passage attendus
- 2 questions hors-contexte (test anti-hallucination)

Structure :
```
Question | Document_attendu | Passage_attendu | Reponse_attendue | Reponse_chatbot | Score
```

### Métriques mesurées

| Métrique | Description | Objectif |
|---|---|---|
| Top-1 Accuracy | Le bon document est le 1er résultat | ≥ 60% |
| Top-3 Accuracy | Le bon document est dans les 3 premiers | ≥ 80% |
| Top-5 Accuracy | Le bon document est dans les 5 premiers | ≥ 90% |
| Anti-hallucination | Questions hors-contexte correctement rejetées | 100% |

### Lancer l'évaluation

```bash
cd backend
..\backend\venv\Scripts\python.exe ..\evaluation\evaluate_retrieval.py
```

Voir [`evaluation/retrieval_metrics.md`](evaluation/retrieval_metrics.md) pour le détail des métriques.

---

## Contrôle Anti-Hallucination

Le système utilise plusieurs mécanismes pour éviter que le LLM invente des informations :

1. **Prompt strict** : *"Tu utilises UNIQUEMENT les passages CONTEXT. N'invente pas d'exigences."*
2. **Flag `answer_in_context`** : Si `false`, la confiance est forcée à "Faible"
3. **Seuil de distance** : Chunks filtrés si distance cosinus > 2.35
4. **Temperature 0.15** : Réduit la créativité du LLM
5. **Citations numérotées** : Le LLM cite `[1]`, `[2]`... dans sa réponse

Voir [`docs/anti_hallucination.md`](docs/anti_hallucination.md) pour le détail.

---

## Droits d'Accès

| Niveau | Mécanisme |
|---|---|
| Authentification | JWT Bearer Token (HS256, 8h) |
| Rôles | `admin` (complet) / `user` (lecture) |
| Criticité | Documents "Critical" invisibles aux users |
| Multi-tenant | Isolation par champ `site` |
| Clés API | Chiffrées Fernet en base de données |
| Audit trail | Chaque requête loguée dans `activity_logs` |

Voir [`docs/access_control.md`](docs/access_control.md) pour le détail.

---

## API REST

La documentation Swagger est accessible à : **http://localhost:8000/docs**

Principaux endpoints :

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/auth/login` | POST | Authentification |
| `/api/chat` | POST | Interroger le chatbot |
| `/api/search` | POST | Recherche documentaire |
| `/api/documents` | GET/POST | Gestion des documents |
| `/api/config` | GET/POST | Configuration LLM (admin) |
| `/api/users` | GET/POST | Gestion utilisateurs (admin) |
| `/api/logs` | GET | Audit trail (admin) |
| `/api/audit/checklist` | GET | Checklist ISO 9001 |

---

## Modèle d'Embeddings

- **Modèle** : `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Taille** : ~457 MB (téléchargé automatiquement au premier démarrage)
- **Langues** : 50+ langues dont FR et EN
- **Dimension** : 384
- **Persistance** : `backend/chroma_db/`

---

## Contribuer

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amelioration`)
3. Committer (`git commit -m 'Ajout fonctionnalité X'`)
4. Push (`git push origin feature/amelioration`)
5. Ouvrir une Pull Request

---

## Licence

Ce projet est développé dans le cadre d'un projet académique.

---

*Dernière mise à jour : Juin 2024*
