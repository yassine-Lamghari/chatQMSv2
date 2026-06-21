# Installation & Démarrage rapide

## 1. Cloner le projet

```bash
git clone https://github.com/yassine-Lamghari/chatQMSv2.git
cd chatQMSv2
```

## 2. Backend — Environnement Python

### Créer l'environnement virtuel

````{tab-set}
```{tab-item} Windows
bash
python -m venv venv
.\venv\Scripts\activate
```
```{tab-item} Linux / macOS
bash
python -m venv venv
source venv/bin/activate
```
````

### Installer les dépendances

```bash
cd backend
pip install -r requirements.txt
```

```{note}
L'installation de `sentence-transformers` téléchargera ~500MB de modèles au premier lancement.
```

### (Optionnel) Extraction d'images PDF

```bash
pip install pymupdf
```

## 3. Générer les clés de sécurité

```bash
# Clé JWT (64 octets hexadécimaux)
python -c "import secrets; print(secrets.token_hex(64))"

# Clé de chiffrement Fernet pour les clés API
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Notez les deux valeurs générées pour l'étape suivante.

## 4. Configurer le fichier `.env`

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # Linux/macOS
```

Éditez `backend/.env` :

```ini
# Sécurité JWT
JWT_SECRET_KEY=<votre_clé_jwt_64_octets>
JWT_EXPIRE_MINUTES=480

# Chiffrement des clés API
API_KEY_ENCRYPTION_KEY=<votre_clé_fernet>

# LLM (configurez au moins un provider)
GROQ_CHAT_MODEL=llama-3.1-8b-instant
GEMINI_CHAT_MODEL=gemini-2.0-flash

# RAG
RAG_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
CHROMA_PERSIST_DIR=./chroma_db

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000
```

## 5. Créer le compte administrateur

```bash
# Depuis backend/
python seed_admin.py
```

Cela crée un compte `admin` / `admin` par défaut.

```{caution}
Changez le mot de passe administrateur immédiatement après la première connexion via le panneau `/admin`.
```

## 6. Lancer le backend

````{tab-set}
```{tab-item} Windows (PowerShell)
bash
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000
```
```{tab-item} Linux / macOS
bash
uvicorn main:app --host 0.0.0.0 --port 8000
```
````

Vérifier que l'API répond :

```bash
curl http://localhost:8000/
# {"message": "Welcome to the QMS Chatbot API"}
```

```{important}
Au premier démarrage, le modèle d'embedding (457 MB) se charge en **arrière-plan**. L'API est disponible immédiatement, mais les recherches RAG ne fonctionnent qu'après ~60 secondes. Le log `RAG: modèle pret !` confirme la disponibilité.
```

## 7. Lancer le frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## 8. Lancement groupé (Windows)

Un script batch lance les deux serveurs simultanément :

```bat
# Depuis la racine du projet
.\start_servers.bat
```

## 9. Vérification finale

Ouvrez http://localhost:3000, connectez-vous avec `admin` / `admin`, puis :

1. Allez dans **Admin** → **Documents** → importez un PDF de test
2. Attendez ~5 secondes (indexation en arrière-plan)
3. Retournez sur **Chat** → posez une question sur le document

Si une réponse apparaît avec des sources, l'installation est complète. ✅
