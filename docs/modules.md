# Modules Python — Référence

## `main.py` — API FastAPI

Point d'entrée principal de l'application. Contient **35+ endpoints REST** organisés par domaine.

### Démarrage (`on_startup`)

```python
@app.on_event("startup")
def on_startup():
    init_db()                    # Crée les tables SQLite
    seed_default_templates(db)   # Insère les templates QMS par défaut
    # Pré-charge le modèle d'embedding en arrière-plan (thread daemon)
    threading.Thread(target=_preload_models, daemon=True).start()
```

### Dépendances d'authentification

```python
def get_optional_user(authorization) -> dict | None
# Authentification optionnelle (retourne None si absent)

def require_auth(authorization) -> dict
# Authentification obligatoire (401 si absent)

def require_admin(authorization) -> dict
# Authentification admin obligatoire (403 si rôle user)
```

### Helpers internes

```python
def _active_llm_settings(db) -> tuple[str, str, str, str]
# Retourne (provider, api_key, base_url, ollama_model) du LLM actif

def _can_access_criticality(user_role, criticality) -> bool
# True si l'utilisateur peut accéder à ce niveau de criticité

def _confidence_label(score, locale) -> str
# Convertit un score numérique en label (Élevé/Moyen/Faible)

def _not_found_payload(locale) -> dict
# Retourne une réponse "aucun résultat" localisée

def _log_activity(db, action, username, query, ...) -> None
# Insère une entrée dans activity_logs (best-effort, non-bloquant)
```

---

## `auth.py` — Authentification JWT

```python
create_access_token(data: dict) -> str
```

Crée un JWT signé HS256 avec expiration.

- **Algorithme :** HS256
- **Expiration :** `JWT_EXPIRE_MINUTES` depuis maintenant
- **Payload :** `{sub, role, site, exp}`

```python
decode_access_token(token: str) -> dict | None
```

Décode et valide un JWT. Retourne `None` si invalide ou expiré.

**Variables :**

| Variable | Description |
|---|---|
| `SECRET_KEY` | Depuis `JWT_SECRET_KEY` (générée aléatoirement si absente) |
| `ALGORITHM` | `"HS256"` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Depuis `JWT_EXPIRE_MINUTES` (défaut : 480) |

---

## `crypto_utils.py` — Chiffrement Fernet

```python
encrypt_api_key(plain: str | None) -> str | None
```

Chiffre une clé API avec Fernet (AES-128-CBC + HMAC-SHA256).

- Retourne `None` si `plain` est vide
- Fallback en clair si `API_KEY_ENCRYPTION_KEY` non configurée

```python
decrypt_api_key(stored: str | None) -> str | None
```

Déchiffre une clé API depuis la base.

- Gère automatiquement les valeurs legacy stockées en clair
- Retourne `None` si `stored` est vide

---

## `rag.py` — Pipeline RAG

### Constantes

```python
EMBEDDING_MODEL_NAME  # depuis RAG_EMBEDDING_MODEL
CHROMA_PERSIST_DIR    # depuis CHROMA_PERSIST_DIR
SUPPORTED_EXTENSIONS  # {".pdf", ".docx", ".doc", ".xlsx", ...}
IMAGES_DIR            # depuis IMAGES_DIR (défaut: ./uploads/images)
```

### Fonctions principales

```python
get_embeddings() -> HuggingFaceEmbeddings
```
Lazy singleton du modèle d'embedding. Chargé une seule fois en mémoire.

```python
get_vector_store() -> Chroma
```
Retourne l'instance ChromaDB connectée au répertoire persistant.

```python
ingest_document(file_path: str, doc_id: int, metadata: dict) -> None
```

Ingère un document dans ChromaDB :
1. Charge le document selon son extension
2. Découpe en chunks (900 chars, overlap 220)
3. Ajoute les vecteurs dans ChromaDB
4. Pour les PDF : extrait et indexe les images

```python
search_similar_chunks(
    query: str,
    k: int = 4,
    metadata_filter: dict | None = None,
    fetch_multiplier: int = 6
) -> list[tuple[Document, float]]
```

Recherche hybride (vecteur + BM25 + RRF). Retourne `(Document, distance)` triés par pertinence croissante.

```python
remove_document_from_index(doc_id: int) -> None
```

Supprime tous les chunks d'un document de ChromaDB via `where={"doc_id": str(doc_id)}`.

```python
extract_images_from_pdf(file_path: str, doc_id: int, metadata: dict) -> list[dict]
```

Extrait les images d'un PDF via PyMuPDF. Ignore les images < `RAG_MIN_IMAGE_BYTES`.

### Classe `SimpleBM25`

```python
class SimpleBM25:
    def __init__(self, corpus: list[list[str]], k1: float = 1.5, b: float = 0.75)
    def get_idf(self, term: str) -> float
    def get_scores(self, query: list[str]) -> list[float]
```

Implémentation BM25 pure Python. Instanciée à chaque appel de `search_similar_chunks` sur le corpus complet.

---

## `llm_rag.py` — Synthèse LLM

```python
invoke_llm(
    provider: str,
    *,
    api_key: str | None,
    base_url: str | None,
    ollama_model: str | None,
    system_prompt: str,
    user_prompt: str,
) -> str
```

Appelle le LLM configuré. Supporte : `groq`, `gemini`, `deepseek`, `ollama`.
- **Groq/Gemini :** via LangChain (`ChatGroq`, `ChatGoogleGenerativeAI`)
- **DeepSeek :** via HTTP direct (`urllib.request`)
- **Ollama :** via LangChain (`ChatOllama`)
- **Température :** 0.15 (réponses factuelles)

```python
synthesize_from_context(
    *,
    provider, api_key, base_url, ollama_model,
    user_query: str,
    numbered_context: str,
    respond_english: bool,
    language_mode: str = "document_language",
) -> dict | None
```

Génère une réponse structurée JSON à partir du contexte RAG numéroté.
Retourne `None` en cas d'échec (fallback vers extraits bruts).

```python
generate_pfmea_rows_llm(
    *,
    provider, api_key, base_url, ollama_model,
    process, product, known_defects, numbered_context,
    respond_english,
) -> list[dict] | None
```

Génère des lignes PFMEA enrichies via LLM. Retourne `None` si le LLM échoue (fallback `pfmea_skeleton_rows`).

```python
build_numbered_context(section_refs: list[str], snippets: list[str], max_chunks: int) -> str
```

Formate le contexte RAG : `[1] ref\ncontenu\n\n---\n\n[2] ref\n...`

```python
parse_llm_json(raw: str) -> dict | None
```

Parse la réponse JSON du LLM (gère les fences markdown ```json ... ```).

---

## `services_qms.py` — Logique métier QMS

```python
audit_questions_for_standard(standard: str, process: str) -> list[str]
```

Génère les questions de checklist :
- **ISO 9001 :** 7 domaines (Contexte, Leadership, Planification, Support, Opérations, Évaluation, Amélioration)
- **IATF 16949 :** +6 exigences automobile (CSR, sécurité produit, plan de contrôle, 8D, second-party audit...)

```python
audit_sampling_plan(process: str, depth: str = "normal") -> dict
```

Calcule le plan d'échantillonnage déterministe :

| Depth | Documents | Enregistrements |
|---|---|---|
| `light` | 5 | 8 |
| `normal` | 12 | 15 |
| `thorough` | 20 | 25 |

```python
pfmea_skeleton_rows(process, product, known_defects, rag_excerpts) -> list[dict]
```

Génère un squelette PFMEA de base (sans LLM) à partir des défauts connus séparés par `,` ou `;`.

```python
verify_pfmea_row(row: dict) -> tuple[list[str], list[str]]
```

Retourne `(missing_fields, warnings)` :
- **Champs obligatoires :** `failure_mode`, `effects`, `severity`, `occurrence`, `detection`
- **Alerte RPN :** si S × O × D > 200

---

## `database.py` — ORM SQLAlchemy

```python
init_db() -> None
```

Crée toutes les tables SQLite et exécute `migrate_sqlite_schema()`.

```python
migrate_sqlite_schema() -> None
```

Migrations légères via `ALTER TABLE` pour compatibilité ascendante.

```python
seed_default_templates(db: Session) -> None
```

Insère `pfmea_blank` et `audit_iso9001` si absents.

```python
get_db() -> Generator[Session, None, None]
```

Dependency injection FastAPI — session DB par requête.

### Modèles SQLAlchemy

```python
class User(Base)           # Utilisateurs et rôles
class LLMConfig(Base)      # Configuration providers LLM
class AppSetting(Base)     # Paramètres clé-valeur
class DocumentMetadata(Base)   # Métadonnées des documents
class DocumentTemplate(Base)   # Templates QMS
class ActivityLog(Base)    # Journal d'activité
class ChatSession(Base)    # Sessions de chat persistantes
class AuditResult(Base)    # Checklists audit sauvegardées
```
