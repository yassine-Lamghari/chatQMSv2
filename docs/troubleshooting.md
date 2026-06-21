# Dépannage

## ❌ ERR_CONNECTION_REFUSED sur localhost:3000

**Cause :** Le serveur frontend n'est pas démarré.

**Solution :**

```bash
cd frontend
npm run dev
# Attendre "✓ Ready in Xs"
```

---

## ❌ Port 8000 non disponible

**Vérification :**

```powershell
netstat -ano | findstr ":8000"
```

**Solution :** Lancer le backend directement et observer les logs :

```bash
cd backend
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000
```

---

## ❌ "Aucun contexte pertinent trouvé"

**Causes possibles :**

1. Aucun document indexé → Uploader des documents via `/admin`
2. Question hors sujet des documents indexés
3. Modèle d'embedding différent de celui utilisé pour l'indexation

**Vérification du nombre de chunks indexés :**

```python
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

emb = HuggingFaceEmbeddings(
    model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)
db = Chroma(persist_directory="./chroma_db", embedding_function=emb)
print(f"Chunks indexés : {db._collection.count()}")
```

---

## ❌ LLM ne répond pas

**Vérifier le statut :**

```bash
curl http://localhost:8000/api/llm/status
```

**Solutions par provider :**

| Provider | Vérification |
|---|---|
| **Groq** | Vérifier la clé API dans `/admin` → Configuration LLM |
| **Gemini** | Vérifier la clé API Google AI Studio |
| **DeepSeek** | Vérifier la clé API DeepSeek |
| **Ollama** | Lancer `ollama serve` et `ollama pull llama3.2` |

---

## ❌ Avertissements JWT_SECRET_KEY / API_KEY_ENCRYPTION_KEY

Ces messages sont des **avertissements**, pas des erreurs bloquantes. Le serveur fonctionne.

**Solution :** Générer et configurer les clés dans `.env` :

```bash
# JWT
python -c "import secrets; print(secrets.token_hex(64))"

# Fernet
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## ❌ Démarrage lent (60–120 secondes)

**Cause normale :** Chargement du modèle d'embedding (457 MB) au premier démarrage ou après redémarrage.

Le chargement s'effectue en arrière-plan — l'API répond immédiatement. Attendez le log :

```
RAG: modèle pret !
```

---

## ❌ Erreur lors de l'upload d'un document

**Vérifications :**

1. Extension supportée : `.pdf`, `.docx`, `.doc`, `.xlsx`, `.xls`, `.pptx`, `.ppt`, `.png`, `.jpg`, `.jpeg`
2. Dossier `uploads/` accessible en écriture
3. Espace disque suffisant

**Vérifier l'espace disque :**

```powershell
Get-PSDrive C | Select-Object Used, Free
```

---

## ❌ Build ReadTheDocs échoue

**Vérifications dans le dashboard ReadTheDocs :**

1. Aller dans **Admin** → **Builds** → cliquer sur le build échoué
2. Lire les logs d'erreur

**Erreurs communes :**

| Erreur | Solution |
|---|---|
| `conf.py not found` | Vérifier que `docs/conf.py` est committé |
| `myst_parser not found` | Vérifier `docs/requirements.txt` contient `myst-parser` |
| `WARNING: document isn't included in any toctree` | Ajouter le fichier dans `index.rst` |
| `Extension error: sphinx_design` | Vérifier `docs/requirements.txt` |

**Test local du build avant commit :**

```bash
pip install -r docs/requirements.txt
sphinx-build -b html docs docs/_build/html -W
```

L'option `-W` traite les warnings comme des erreurs (identique au comportement RTD).
