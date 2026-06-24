# Droits d'Accès et Contrôle des Autorisations — QMS Chatbot

## Architecture Globale

Le système implémente un contrôle d'accès multi-niveau basé sur **JWT**, **rôles**, **criticité des documents** et **isolation multi-tenant par site**.

---

## Niveau 1 — Authentification JWT

Toutes les requêtes protégées nécessitent un **Bearer Token JWT** dans l'en-tête HTTP :

```
Authorization: Bearer <jwt_token>
```

### Paramètres JWT

| Paramètre | Valeur |
|---|---|
| Algorithme | HS256 |
| Durée de validité | 480 minutes (8 heures) |
| Clé secrète | Variable d'environnement `JWT_SECRET_KEY` |

### Payload du token

```json
{
  "sub": "username",
  "role": "admin | user",
  "site": "nom_du_site",
  "exp": 1735000000
}
```

---

## Niveau 2 — Rôles Utilisateur

Deux rôles sont définis dans la table `users` :

| Rôle | Description | Accès |
|---|---|---|
| `admin` | Administrateur système | Accès complet : configuration LLM, gestion utilisateurs, logs, tous les documents |
| `user` | Utilisateur standard | Accès lecture : recherche, chat, audit (documents non-critiques uniquement) |

### Dépendances FastAPI utilisées

```python
def require_auth(authorization):
    """Vérifie que le token JWT est valide."""
    ...

def require_admin(authorization):
    """Vérifie que le token JWT est valide ET que le rôle est 'admin'."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
```

---

## Niveau 3 — Protection des Endpoints

### Tableau complet des protections

| Endpoint | Méthode | Protection | Rôle requis |
|---|---|---|---|
| `/api/auth/login` | POST | Aucune | — |
| `/api/auth/register` | POST | Aucune | — |
| `/api/config` | GET/POST | `require_admin` | admin |
| `/api/config/{provider}` | POST/PUT/DELETE | `require_admin` | admin |
| `/api/users` | GET | `require_admin` | admin |
| `/api/users` | POST | `require_admin` | admin |
| `/api/users/{id}` | PUT/DELETE | `require_admin` | admin |
| `/api/logs` | GET | `require_admin` | admin |
| `/api/documents` | GET | `require_auth` | user/admin |
| `/api/search` | POST | `require_auth` | user/admin |
| `/api/search/advanced` | POST | `require_auth` | user/admin |
| `/api/audit/checklist/save` | POST | `require_auth` | user/admin |
| `/api/chat` | POST | ⚠️ Optionnelle | — |
| `/api/documents` | POST (upload) | ⚠️ Optionnelle | — |
| `/api/documents/{id}` | DELETE | ⚠️ Optionnelle | — |

> ⚠️ **Note** : Les endpoints marqués "Optionnelle" acceptent un token JWT si fourni mais ne le requièrent pas. Dans une version de production, ces endpoints devraient être protégés par `require_auth`.

---

## Niveau 4 — Contrôle par Criticité de Document

Chaque document possède un niveau de criticité stocké dans la table `document_metadata` :

| Criticité | Accès `user` | Accès `admin` |
|---|---|---|
| `Low` | ✅ | ✅ |
| `Medium` | ✅ | ✅ |
| `High` | ✅ | ✅ |
| `Critical` | ❌ | ✅ |

### Fonction de contrôle (`main.py`)

```python
def _can_access_criticality(user_role: str, criticality: str) -> bool:
    if user_role == "admin":
        return True
    c = (criticality or "").strip().lower()
    if c == "critical":
        return False  # Accès refusé aux users non-admin
    return True
```

Ce filtre est appliqué **après le retrieval ChromaDB** : les chunks sont récupérés puis filtrés en Python avant d'être envoyés au LLM.

---

## Niveau 5 — Isolation Multi-Tenant par Site

Le champ `site` permet d'isoler les données entre plusieurs organisations ou sites industriels :

```python
# Table users
class User(Base):
    site = Column(String, default="default")  # ex: "usine_nord", "siege"

# Table document_metadata
class DocumentMetadata(Base):
    site = Column(String, default="default")  # site propriétaire du document
```

### Fonctionnement

1. Lors de l'upload d'un document, le `site` de l'utilisateur est associé au document
2. Lors du retrieval, le `metadata_filter` de ChromaDB peut inclure `{"site": user_site}`
3. Un utilisateur du site "usine_nord" ne voit pas les documents du site "siege" et vice-versa

---

## Niveau 6 — Filtrage au Niveau ChromaDB

La fonction `search_similar_chunks()` accepte un `metadata_filter` qui est passé directement à ChromaDB :

```python
# Exemple de filtre appliqué au retrieval
metadata_filter = {
    "doc_type": "procedure",     # par type de document
    "language": "fr",            # par langue
    "site": "usine_nord",        # par site (multi-tenant)
    "owner": "responsable_q",    # par propriétaire
    "criticality": "High",       # par criticité
}

results = search_similar_chunks(query, k=4, metadata_filter=metadata_filter)
```

> **Limitation** : ChromaDB utilise **une seule collection globale**. L'isolation est donc assurée par les métadonnées des chunks, pas par des collections séparées. Une isolation stricte au niveau vectoriel nécessiterait des collections distinctes par site.

---

## Niveau 7 — Sécurité des Clés API LLM

Les clés API des providers LLM (Groq, Gemini, DeepSeek) sont **chiffrées avec Fernet** avant stockage en base de données :

```python
# crypto_utils.py
from cryptography.fernet import Fernet

def encrypt_api_key(key: str) -> str:
    f = Fernet(ENCRYPTION_KEY)
    return f.encrypt(key.encode()).decode()

def decrypt_api_key(encrypted: str) -> str:
    f = Fernet(ENCRYPTION_KEY)
    return f.decrypt(encrypted.encode()).decode()
```

Les clés ne sont **jamais retournées en clair** via l'API (`"***"` dans les réponses GET).

---

## Niveau 8 — Audit Trail

Chaque interaction utilisateur est enregistrée dans la table `activity_logs` :

```sql
CREATE TABLE activity_logs (
    id          INTEGER PRIMARY KEY,
    username    VARCHAR NOT NULL,
    action      VARCHAR NOT NULL,         -- ex: "chat_query", "document_upload"
    query       TEXT,                     -- question posée
    document_ids VARCHAR,                 -- documents retrouvés
    confidence  VARCHAR,                  -- High/Medium/Low
    confidence_score VARCHAR,             -- score numérique
    language_mode VARCHAR,
    response_summary TEXT,
    created_at  DATETIME
);
```

Les administrateurs peuvent consulter les logs via `GET /api/logs` pour surveiller l'usage et détecter les tentatives d'accès non autorisé.

---

## Synthèse

```
Requête utilisateur
        │
        ▼
[1] Vérification JWT (token valide ? non expiré ?)
        │
        ▼
[2] Vérification du rôle (user vs admin)
        │
        ▼
[3] Retrieval ChromaDB avec metadata_filter (site, type, langue...)
        │
        ▼
[4] Filtrage post-retrieval par criticité (_can_access_criticality)
        │
        ▼
[5] Envoi au LLM (uniquement les chunks autorisés)
        │
        ▼
[6] Logging dans activity_logs (audit trail)
        │
        ▼
  Réponse à l'utilisateur
```

---

## Limitations Actuelles et Améliorations Futures

| Limitation | Impact | Solution recommandée |
|---|---|---|
| `/api/chat` sans auth requise | Accès chatbot sans connexion | Ajouter `require_auth` |
| Upload sans auth requise | N'importe qui peut uploader | Ajouter `require_auth` |
| Une seule collection ChromaDB | Pas d'isolation vectorielle stricte | Collections par site |
| Filtre criticité post-RAG | Légère fuite d'information temporelle | Pré-filtrage dans ChromaDB |
| Pas de droits par document individuel | Pas de granularité fine | Table `document_permissions` |
