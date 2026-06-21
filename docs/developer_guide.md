# Guide développeur

## Ajouter un nouveau provider LLM

**1. Éditer `llm_rag.py` — fonction `invoke_llm()` :**

```python
if p == "nouveau_provider":
    from langchain_nouveau import ChatNouveau
    model = os.getenv("NOUVEAU_CHAT_MODEL", "nouveau-model-v1")
    llm = ChatNouveau(api_key=api_key.strip(), model=model, temperature=0.15)
    msg = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
    return str(msg.content)
```

**2. Ajouter dans `.env.example` :**

```ini
NOUVEAU_CHAT_MODEL=nouveau-model-v1
```

**3. Installer la dépendance :**

```bash
pip install langchain-nouveau
# Ajouter dans requirements.txt
```

Le provider apparaît automatiquement dans l'admin si une `LLMConfig` est créée en base.

---

## Changer le modèle d'embedding

```{caution}
Changer le modèle d'embedding invalide **tous les vecteurs existants** dans ChromaDB !
```

```bash
# 1. Arrêter le backend
# 2. Supprimer la base vectorielle
Remove-Item -Recurse -Force .\backend\chroma_db\   # Windows PowerShell
# rm -rf backend/chroma_db/                        # Linux/macOS

# 3. Modifier dans .env
RAG_EMBEDDING_MODEL=sentence-transformers/votre-nouveau-modele

# 4. Redémarrer le backend
# 5. Réimporter tous les documents via /admin → Documents
```

**Modèles recommandés :**

| Modèle | Dim | Langues | Taille |
|---|---|---|---|
| `paraphrase-multilingual-MiniLM-L12-v2` | 384 | 50+ | 457 MB |
| `paraphrase-multilingual-mpnet-base-v2` | 768 | 50+ | ~1.1 GB |
| `all-MiniLM-L6-v2` | 384 | EN only | 80 MB |

---

## Activer le Cross-Encoder Reranker

```bash
# Dans .env
RAG_ENABLE_RERANKER=1
```

```{warning}
Le cross-encoder `cross-encoder/ms-marco-MiniLM-L-6-v2` consomme ~500MB RAM supplémentaires et ralentit les requêtes de 2–5x. À activer uniquement sur des machines avec 8Go+ RAM.
```

---

## Ajouter un type de document

**`rag.py` — Ajouter l'extension et le chargeur :**

```python
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".xlsx", ..., ".nouveau"}

def ingest_document(file_path, doc_id, metadata):
    ...
    elif ext in [".nouveau"]:
        loader = NouveauLoader(file_path)
        documents = loader.load()
```

---

## Migrations de base de données

La fonction `migrate_sqlite_schema()` gère les migrations légères :

```python
# Dans database.py, migrate_sqlite_schema()
if insp.has_table("ma_table"):
    cols = {c["name"] for c in insp.get_columns("ma_table")}
    if "nouvelle_colonne" not in cols:
        conn.execute(text("ALTER TABLE ma_table ADD COLUMN nouvelle_colonne VARCHAR"))
```

Cette approche permet d'ajouter des colonnes sans perdre les données existantes. Pas de rollback — prévoyez une sauvegarde de `qms_chatbot.db` avant toute migration.

---

## Ajouter un endpoint API

**Structure standard dans `main.py` :**

```python
class MonPayload(BaseModel):
    champ1: str
    champ2: int = 5

@app.post("/api/mon-endpoint")
def mon_endpoint(
    payload: MonPayload,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_auth),  # ou require_admin
):
    # Logique métier
    result = ...
    _log_activity(db, action="mon-action", username=payload.username)
    return result
```

---

## Lancer les tests

```bash
cd backend

# Test des imports
python check_imports.py

# Test du modèle d'embedding
python test_embeddings.py

# Test du pipeline RAG
python test_rag.py

# Test basique de l'application
python test_app.py
```

---

## Build de la documentation

```bash
cd docs

# Installer les dépendances Sphinx
pip install -r requirements.txt

# Build HTML local
sphinx-build -b html . _build/html

# Ouvrir dans le navigateur
start _build/html/index.html   # Windows
# open _build/html/index.html  # macOS
```

---

## Variables d'environnement utiles pour le développement

```ini
# Activer le reranker (tests de performance)
RAG_ENABLE_RERANKER=1

# Réduire la taille minimale des images extraites (pour tests)
RAG_MIN_IMAGE_BYTES=100

# Base ChromaDB séparée pour les tests
CHROMA_PERSIST_DIR=./chroma_db_test
```
