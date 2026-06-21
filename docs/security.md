# Sécurité

## Vue d'ensemble

QMS Chatbot v2 implémente plusieurs couches de sécurité pour protéger les données documentaires et les accès utilisateurs.

```{admonition} Principe de défense en profondeur
:class: important

Chaque couche de sécurité est indépendante : la compromission d'une couche ne suffit pas à compromettre l'ensemble du système.
```

## Authentification JWT

### Fonctionnement

```{mermaid}
sequenceDiagram
    participant C as Client
    participant API as FastAPI
    participant DB as SQLite

    C->>API: POST /api/auth/login {username, password}
    API->>DB: Requête utilisateur
    DB-->>API: {password_hash, role, site}
    API->>API: bcrypt.checkpw(password, hash)
    API->>API: jwt.encode({sub, role, site, exp})
    API-->>C: {token: "eyJ..."}
    C->>API: GET /api/documents\nAuthorization: Bearer eyJ...
    API->>API: jwt.decode(token, SECRET_KEY)
    API-->>C: [documents]
```

### Configuration

| Paramètre | Valeur |
|---|---|
| **Algorithme** | HS256 (HMAC-SHA256) |
| **Payload** | `{sub: username, role: role, site: site, exp: timestamp}` |
| **Expiration** | `JWT_EXPIRE_MINUTES` (défaut : 480 min = 8h) |
| **Clé** | `JWT_SECRET_KEY` (min 64 chars, générée aléatoirement si absente) |

## Contrôle d'accès (RBAC)

### Niveaux d'accès

| Niveau | Decorator | Endpoints |
|---|---|---|
| **Public** | — | `GET /`, `POST /api/auth/login`, `POST /api/chat`, `GET /api/templates` |
| **Authentifié** | `require_auth` | `GET /api/documents`, `POST /api/search`, `POST /api/sessions` |
| **Admin** | `require_admin` | `GET /api/users`, `GET /api/logs`, `GET /api/config`, `GET /api/stats` |

### Accès par criticité documentaire

```python
def _can_access_criticality(user_role: str, criticality: str) -> bool:
    if user_role == "admin":
        return True          # Admin voit tous les documents
    if criticality == "critical":
        return False         # User ne voit pas les docs critiques
    return True
```

Les documents marqués `Critical` sont filtrés des résultats de chat et de recherche pour les utilisateurs standard.

## Chiffrement des clés API

### Fernet (AES-128-CBC + HMAC-SHA256)

```python
# Chiffrement avant stockage
encrypted = fernet.encrypt(api_key.encode()).decode()
# Résultat : token Fernet base64 (~200 chars)

# Déchiffrement à l'usage
plain = fernet.decrypt(stored.encode()).decode()
```

### Garanties

| Propriété | Valeur |
|---|---|
| **Algorithme** | AES-128-CBC (chiffrement) + HMAC-SHA256 (intégrité) |
| **Format** | Token Fernet base64 URL-safe |
| **En base** | Jamais en clair |
| **Via API** | Retourné masqué `***` dans toutes les réponses |
| **En mémoire** | Déchiffré uniquement lors de l'appel LLM |

### Comportement de fallback

Si `API_KEY_ENCRYPTION_KEY` n'est pas configurée :
- Avertissement au démarrage
- Stockage en clair (comportement legacy)
- Fonctionnement maintenu sans interruption

## Hachage des mots de passe

```python
# Hachage (à l'inscription)
hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

# Vérification (à la connexion)
bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
```

| Propriété | Valeur |
|---|---|
| **Algorithme** | bcrypt (adaptive, résistant aux GPUs) |
| **Salt** | Généré aléatoirement par bcrypt |
| **Stocké** | Hash complet (salt + hash) |

## Rate Limiting

Configuration via **slowapi** (wrapper Python de Flask-Limiter) :

```python
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

- Limite par **adresse IP**
- Retourne `429 Too Many Requests` si dépassé
- Configurable par endpoint

## Validation des fichiers uploadés

### Extensions autorisées

```python
SUPPORTED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xlsx", ".xls",
                         ".pptx", ".ppt", ".png", ".jpg", ".jpeg"}
```

### Sécurité du serveur d'images

```python
# Validation stricte du nom de fichier (prevent path traversal)
if not re.match(r'^[\w\-]+\.(?:png|jpg|jpeg|gif|webp|bmp)$', filename, re.IGNORECASE):
    raise HTTPException(400, "Invalid filename")
if not re.match(r'^\d+$', doc_id):
    raise HTTPException(400, "Invalid doc_id")
```

## CORS

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,  # depuis .env FRONTEND_URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Seules les origines définies dans `FRONTEND_URL` peuvent accéder à l'API.

## Recommandations de production

```{tip}
**Liste de contrôle pour la mise en production :**

- [ ] `JWT_SECRET_KEY` configurée (min 64 chars)
- [ ] `API_KEY_ENCRYPTION_KEY` configurée (clé Fernet)
- [ ] Mot de passe admin changé
- [ ] `.env` dans `.gitignore`
- [ ] HTTPS activé (reverse proxy nginx/caddy)
- [ ] `FRONTEND_URL` pointant sur le domaine de production
- [ ] `chroma_db/` et `uploads/` avec sauvegardes régulières
- [ ] Logs applicatifs monitorés
```
