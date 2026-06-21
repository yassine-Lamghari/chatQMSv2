# Modèle de données

QMS Chatbot v2 utilise **SQLite** comme base de données relationnelle, gérée via **SQLAlchemy 2.0**.

## Schéma de la base

```{mermaid}
erDiagram
    User {
        int id PK
        string username
        string password_hash
        string role
        string site
    }
    DocumentMetadata {
        int id PK
        string filename
        string file_path
        string doc_type
        string criticality
        string version
        string owner
        string language
        string site
        datetime uploaded_at
    }
    LLMConfig {
        int id PK
        string provider
        string api_key
        string base_url
        string model_name
    }
    AppSetting {
        int id PK
        string key
        string value
    }
    ActivityLog {
        int id PK
        string username
        string action
        text query
        string document_ids
        string confidence
        string confidence_score
        string language_mode
        text response_summary
        datetime created_at
    }
    ChatSession {
        string id PK
        string username
        string title
        text messages_json
        datetime updated_at
        datetime created_at
    }
    AuditResult {
        int id PK
        string username
        string standard
        string process
        text checklist_json
        datetime created_at
        datetime updated_at
    }
    DocumentTemplate {
        int id PK
        string key
        string name
        string doc_type
        string language
        string version
        text body
    }

    User ||--o{ ChatSession : "possede"
    User ||--o{ ActivityLog : "genere"
    User ||--o{ AuditResult : "cree"
```

## Tables détaillées

### `users`

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | INTEGER | PK | Identifiant auto-incrémenté |
| `username` | VARCHAR | UNIQUE, INDEX | Nom d'utilisateur |
| `password_hash` | VARCHAR | NOT NULL | Hash bcrypt |
| `role` | VARCHAR | défaut `user` | `user` ou `admin` |
| `site` | VARCHAR | défaut `default` | Identifiant multi-site |

---

### `document_metadata`

| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER PK | |
| `filename` | VARCHAR | Nom du fichier original |
| `file_path` | VARCHAR | Chemin relatif `uploads/...` |
| `doc_type` | VARCHAR | Procédure, Instruction, Norme, Audit, PFMEA... |
| `criticality` | VARCHAR | `Low` \| `Medium` \| `High` \| `Critical` |
| `version` | VARCHAR | Version du document |
| `owner` | VARCHAR | Service propriétaire |
| `language` | VARCHAR | `fr` \| `en` \| autre |
| `site` | VARCHAR | Identifiant de site (multi-tenant) |
| `uploaded_at` | DATETIME | Horodatage UTC (auto) |

---

### `llm_configs`

| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER PK | |
| `provider` | VARCHAR UNIQUE | `groq` \| `gemini` \| `deepseek` \| `ollama` |
| `api_key` | VARCHAR | Clé API chiffrée Fernet (ou null) |
| `base_url` | VARCHAR | URL base (Ollama, proxies) |
| `model_name` | VARCHAR | Override du modèle |

---

### `app_settings`

Table clé-valeur pour la configuration applicative.

| Clé | Description |
|---|---|
| `active_llm_provider` | Provider LLM actif (`groq`, `gemini`...) |
| `sharepoint_config` | Configuration SharePoint (JSON sérialisé) |

---

### `activity_logs`

| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER PK | |
| `username` | VARCHAR | Utilisateur (défaut: `anonymous`) |
| `action` | VARCHAR | `chat` \| `upload` \| `delete` |
| `query` | TEXT | Question posée (max 500 chars) |
| `document_ids` | VARCHAR | IDs des sources utilisées (csv) |
| `confidence` | VARCHAR | Élevé / Moyen / Faible |
| `confidence_score` | VARCHAR | Score numérique ex: `0.724` |
| `language_mode` | VARCHAR | Mode langue utilisé |
| `response_summary` | TEXT | Résumé réponse (max 300 chars) |
| `created_at` | DATETIME | Horodatage UTC |

---

### `chat_sessions`

| Colonne | Type | Description |
|---|---|---|
| `id` | VARCHAR PK | UUID généré côté client |
| `username` | VARCHAR | Propriétaire de la session |
| `title` | VARCHAR | Titre (max 80 chars) |
| `messages_json` | TEXT | Tableau JSON des messages |
| `updated_at` | DATETIME | Dernière modification |
| `created_at` | DATETIME | Date de création |

---

### `audit_results`

| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER PK | |
| `username` | VARCHAR | Auditeur |
| `standard` | VARCHAR | `ISO 9001` \| `IATF 16949` |
| `process` | VARCHAR | Processus audité |
| `checklist_json` | TEXT | `[{question, checked, note}]` |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

---

### `document_templates`

| Colonne | Type | Description |
|---|---|---|
| `key` | VARCHAR UNIQUE | `pfmea_blank`, `audit_iso9001` |
| `name` | VARCHAR | Nom affiché |
| `doc_type` | VARCHAR | Type de document |
| `body` | TEXT | Contenu du template |

## Migrations

```python
def migrate_sqlite_schema():
    """Ajoute les colonnes manquantes sans perdre les données."""
    with engine.begin() as conn:
        cols = {c["name"] for c in insp.get_columns("document_metadata")}
        if "site" not in cols:
            conn.execute(text("ALTER TABLE document_metadata ADD COLUMN site VARCHAR DEFAULT 'default'"))
```
