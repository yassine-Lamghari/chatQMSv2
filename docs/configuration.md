# Configuration

Toute la configuration du backend est centralisée dans `backend/.env`.

## Variables d'environnement

### 🔐 Sécurité JWT

| Variable | Description | Exemple | Requis |
|---|---|---|---|
| `JWT_SECRET_KEY` | Clé secrète HMAC-SHA256 (min 64 chars) | `69303eec...` | ✅ |
| `JWT_EXPIRE_MINUTES` | Durée de validité du token (minutes) | `480` | Non (défaut: 480) |

```{caution}
`JWT_SECRET_KEY` ne doit **jamais** être committée dans Git. Si elle est compromise, tous les tokens existants sont invalidés — régénérez-la et redémarrez le serveur.
```

Génération :
```bash
python -c "import secrets; print(secrets.token_hex(64))"
```

### 🔒 Chiffrement des clés API

| Variable | Description | Requis |
|---|---|---|
| `API_KEY_ENCRYPTION_KEY` | Clé Fernet Base64 (AES-128-CBC + HMAC-SHA256) | Recommandé |

Sans cette variable, les clés API LLM sont stockées **en clair** dans SQLite (avertissement au démarrage, fonctionnement maintenu).

Génération :
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 🤖 Providers LLM

| Variable | Description | Défaut |
|---|---|---|
| `GROQ_CHAT_MODEL` | Modèle Groq | `llama-3.1-8b-instant` |
| `GEMINI_CHAT_MODEL` | Modèle Gemini | `gemini-2.0-flash` |
| `DEEPSEEK_CHAT_MODEL` | Modèle DeepSeek | `deepseek-chat` |
| `OLLAMA_BASE_URL` | URL serveur Ollama local | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Modèle Ollama | `llama3.2` |

Les clés API des providers cloud sont configurées via l'interface d'administration (`/admin`) et non dans le `.env`.

### 🔍 RAG & ChromaDB

| Variable | Description | Défaut |
|---|---|---|
| `RAG_EMBEDDING_MODEL` | Modèle HuggingFace pour les embeddings | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |
| `CHROMA_PERSIST_DIR` | Répertoire ChromaDB persistant | `./chroma_db` |
| `RAG_MIN_IMAGE_BYTES` | Taille minimale image extraite (octets) | `3000` |
| `RAG_ENABLE_RERANKER` | Activer le cross-encoder reranker | `0` |

```{warning}
Si vous changez `RAG_EMBEDDING_MODEL`, vous devez supprimer `chroma_db/` et réimporter tous les documents. Les dimensions vectorielles ne sont pas compatibles entre modèles.
```

### 🌐 CORS

| Variable | Description | Exemple |
|---|---|---|
| `FRONTEND_URL` | URL(s) frontend autorisées (virgule si plusieurs) | `http://localhost:3000,https://qms.monentreprise.fr` |

## Configuration LLM via l'interface admin

Connectez-vous en tant qu'administrateur sur `/admin`, section **Configuration LLM** :

1. **Saisir la clé API** du provider choisi (Groq, Gemini, ou DeepSeek)
2. **Définir le provider actif** avec le bouton correspondant
3. **Vérifier le statut** via l'indicateur en haut de l'interface de chat

Les clés sont chiffrées avec Fernet avant stockage et ne sont jamais retournées en clair par l'API.

## Configuration Ollama (LLM local)

```bash
# 1. Installer Ollama
# https://ollama.ai/download

# 2. Télécharger un modèle
ollama pull llama3.2

# 3. Lancer Ollama
ollama serve

# 4. Configurer dans .env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

Activez Ollama comme provider actif depuis l'interface admin. Aucune clé API n'est requise.

## Fichier `.env` complet annoté

```ini
# ─── Sécurité JWT ────────────────────────────────────────────────────────────
JWT_SECRET_KEY=<généré avec secrets.token_hex(64)>
JWT_EXPIRE_MINUTES=480

# ─── Chiffrement des clés API ────────────────────────────────────────────────
API_KEY_ENCRYPTION_KEY=<généré avec Fernet.generate_key()>

# ─── LLM Providers ───────────────────────────────────────────────────────────
GROQ_CHAT_MODEL=llama-3.1-8b-instant
GEMINI_CHAT_MODEL=gemini-2.0-flash
DEEPSEEK_CHAT_MODEL=deepseek-chat

# ─── Ollama (local) ──────────────────────────────────────────────────────────
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2

# ─── RAG / Chroma ────────────────────────────────────────────────────────────
RAG_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
CHROMA_PERSIST_DIR=./chroma_db

# ─── Frontend URL (CORS) ─────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
```
