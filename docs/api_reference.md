# Référence API REST

**Base URL :** `http://localhost:8000`
**Authentification :** `Authorization: Bearer <JWT_TOKEN>`
**Content-Type :** `application/json` (sauf upload multipart)

## 🔐 Authentification

### POST /api/auth/login

Authentifie un utilisateur et retourne un token JWT.

**Corps :**
```json
{"username": "admin", "password": "monmotdepasse"}
```

**Réponse 200 :**
```json
{"message": "Login successful", "username": "admin", "role": "admin", "token": "eyJ..."}
```

**Erreurs :** `401` identifiants invalides

---

### POST /api/auth/register

Crée un nouveau compte utilisateur.

**Corps :**
```json
{"username": "john", "password": "motdepasse", "role": "user"}
```

**Erreurs :** `400` username déjà existant

---

## 🤖 Chat & RAG

### POST /api/chat

Envoie une question au pipeline RAG et retourne une réponse synthétisée.

**Corps complet :**

```json
{
  "query": "Quelle est la procédure de contrôle qualité en réception ?",
  "top_k": 5,
  "language_mode": "document_language",
  "respond_in_english": false,
  "response_locale": "fr",
  "user_role": "user",
  "use_llm": true,
  "username": "john",
  "filters": {
    "doc_type": "Procédure",
    "criticality": "High",
    "language": "fr",
    "owner": "QMS",
    "site": "usine-1",
    "date_from": "2024-01-01",
    "date_to": "2025-12-31"
  }
}
```

**Paramètres détaillés :**

| Champ | Type | Défaut | Description |
|---|---|---|---|
| `query` | string | requis | Question en langage naturel |
| `top_k` | int | 5 | Chunks retenus (1–8) |
| `language_mode` | enum | `document_language` | `en_only` \| `document_language` \| `fr_with_en_sources` |
| `respond_in_english` | bool | false | Forcer réponse anglaise |
| `response_locale` | string | `fr` | Langue des messages système |
| `user_role` | string | `user` | `user` \| `admin` |
| `use_llm` | bool | true | Synthèse LLM (false = extraits bruts) |
| `username` | string | `anonymous` | Pour le journal d'activité |
| `filters` | object | `{}` | Filtres métadonnées documents |

**Réponse 200 :**

```json
{
  "summary": "La procédure de réception (PR-QC-001 v2.1) prévoit trois étapes...",
  "summary_bullets": [
    "- Contrôle visuel à réception",
    "- Mesure dimensionnelle (AQL 2.5)",
    "- Validation responsable qualité"
  ],
  "details": "Synthèse structurée citant [1], [2]...",
  "detail_sections": [
    {
      "section_ref": "procedure_reception.pdf — § page 3",
      "excerpt": "3.1 Contrôle à réception...",
      "filename": "procedure_reception.pdf",
      "page": 2,
      "doc_id": "14",
      "language": "fr"
    }
  ],
  "confidence": "Élevé",
  "confidence_score": 0.724,
  "sources": [
    {
      "filename": "procedure_reception.pdf",
      "doc_type": "Procédure",
      "criticality": "High",
      "doc_id": "14",
      "language": "fr",
      "version": "2.1",
      "owner": "QMS",
      "site": "usine-1",
      "relevance": 0.8231,
      "section_ref": "procedure_reception.pdf — § page 3"
    }
  ],
  "generation_mode": "llm",
  "images": [
    {
      "url": "/api/images/14/page_3_img_1.png",
      "page": 3,
      "filename": "procedure_reception.pdf",
      "doc_id": "14",
      "relevance": 0.712
    }
  ]
}
```

---

### GET /api/llm/status

Retourne l'état du LLM actif.

```json
{"configured": true, "provider": "groq", "message": "LLM actif : groq"}
```

---

### GET /api/images/{doc_id}/{filename}

Sert une image extraite d'un PDF.

- **Réponse :** `image/png` (ou format approprié)
- **Erreurs :** `400` nom invalide, `404` image non trouvée

---

## 📄 Documents

### GET /api/documents 🔒 auth

Liste tous les documents indexés.

```json
[
  {
    "id": 14,
    "filename": "procedure_reception.pdf",
    "doc_type": "Procédure",
    "criticality": "High",
    "version": "2.1",
    "owner": "QMS",
    "language": "fr",
    "site": "usine-1",
    "uploaded_at": "2025-01-15T10:23:00"
  }
]
```

---

### POST /api/documents — Upload

**Content-Type :** `multipart/form-data`

| Champ | Type | Défaut | Description |
|---|---|---|---|
| `file` | file | requis | Document à indexer |
| `doc_type` | string | `Procédure` | Type de document |
| `criticality` | string | `Medium` | `Low` \| `Medium` \| `High` \| `Critical` |
| `version` | string | `1.0` | Version |
| `owner` | string | `QMS` | Service propriétaire |
| `language` | string | `fr` | `fr` \| `en` |
| `site` | string | `default` | Identifiant de site |

```{note}
L'indexation ChromaDB est effectuée en **tâche de fond**. Le document est disponible pour la recherche après quelques secondes.
```

**Formats acceptés :** `.pdf` `.docx` `.doc` `.xlsx` `.xls` `.pptx` `.ppt` `.png` `.jpg` `.jpeg`

---

### DELETE /api/documents/{doc_id}

Supprime un document (fichier + index vectoriel + DB).

```json
{"message": "Document deleted"}
```

---

## 🔍 Recherche

### POST /api/search 🔒 auth

```json
{"query": "contrôle dimensionnel pièce", "top_k": 8, "filters": {"doc_type": "Procédure"}}
```

**Réponse :**

```json
{
  "query": "contrôle dimensionnel pièce",
  "hits": [
    {
      "section_ref": "instruction_controle.pdf — § page 5",
      "excerpt": "Le contrôle dimensionnel est effectué...",
      "distance": 0.342,
      "relevance": 0.7104,
      "filename": "instruction_controle.pdf",
      "doc_id": "8"
    }
  ]
}
```

---

### POST /api/search/advanced 🔒 auth

Recherche avec filtres étendus incluant plages de dates.

| Champ | Description |
|---|---|
| `criticality` | Filtrer par criticité |
| `language` | Filtrer par langue |
| `owner` | Filtrer par propriétaire |
| `date_from` | Date upload minimale (ISO 8601) |
| `date_to` | Date upload maximale (ISO 8601) |

---

## 📋 Audit

### POST /api/audit/assistant

Génère un pack d'audit complet.

**Corps :**

```json
{"standard": "ISO 9001", "process": "Contrôle en réception", "depth": "normal", "top_k": 5}
```

**Profondeur d'audit :**

| Valeur | Documents | Enregistrements |
|---|---|---|
| `light` | 5 | 8 |
| `normal` | 12 | 15 |
| `thorough` | 20 | 25 |

**Réponse :**

```json
{
  "standard": "ISO 9001",
  "process": "Contrôle en réception",
  "checklist_normative": [
    "[Contrôle en réception] Context of the organization & interested parties (4.1–4.2)",
    "[Contrôle en réception] Leadership & policy (5.1–5.2)"
  ],
  "audit_plan": [
    {"day": 1, "focus": "Opening meeting, context, leadership"},
    {"day": 2, "focus": "Operation & support processes"},
    {"day": 3, "focus": "Performance, improvement, closing"}
  ],
  "sampling": {"document_sample_size": 12, "record_sample_size": 15},
  "rag_evidence_checks": ["1. Evidence check: ..."],
  "sources": [{"filename": "...", "relevance": 0.68}]
}
```

---

### GET /api/audit/export

Exporte le pack d'audit en Word ou PDF.

**Query params :** `standard`, `process`, `format` (`docx` ou `pdf`)

**Réponse :** Fichier binaire en téléchargement

---

### POST /api/audit/checklist/save 🔒 auth

Sauvegarde une checklist d'audit remplie.

```json
{
  "standard": "ISO 9001", "process": "Réception", "username": "john",
  "checklist": [{"question": "Context of the organization...", "checked": true, "note": "Conforme"}]
}
```

---

### GET /api/audit/checklist/history 🔒 auth

Historique des checklists (20 dernières). Query param : `username` (optionnel).

---

## 🔧 PFMEA

### POST /api/generate/pfmea

Génère un tableau PFMEA enrichi par RAG + LLM.

```json
{"process": "Soudage MIG", "product": "Châssis automobile", "known_defects": "Porosité, fissures", "top_k": 4}
```

**Réponse :**

```json
{
  "template": "pfmea_blank",
  "rows": [
    {
      "line": 1, "process_step": "Soudage MIG",
      "failure_mode": "Porosité", "effects": "Résistance mécanique réduite",
      "severity": "9", "occurrence": "3", "detection": "4", "rpn": "108",
      "recommended_actions": "Contrôle pureté gaz + ressuage"
    }
  ]
}
```

---

### POST /api/generate/verify

Vérifie la complétude d'une ligne PFMEA.

```json
{"mode": "pfmea_row", "data": {"failure_mode": "Porosité", "severity": "9", "occurrence": "3", "detection": "4", "effects": "Rupture"}}
```

**Réponse :** `{"missing_fields": [], "warnings": ["RPN aggregate is high..."], "ok": true}`

---

### POST /api/generate/pfmea/export

Exporte en **Excel** formaté (couleurs RPN : rouge > 200, ambre > 100, vert ≤ 100).

### POST /api/generate/pfmea/export/pdf

Exporte en **PDF** format paysage A4.

---

## 💬 Sessions de chat

### GET /api/sessions?username=john

Récupère les 30 dernières sessions.

### POST /api/sessions

```json
{"session_id": "uuid", "title": "Procédure soudage", "messages": [], "username": "john"}
```

### DELETE /api/sessions/{session_id}

Supprime une session.

---

## ⚙️ Administration LLM

### GET /api/config 🔒 admin

Liste les configs LLM (clés masquées `***`).

### PUT /api/config/{provider} 🔒 admin

Configure une clé API. Providers : `groq`, `gemini`, `deepseek`.

```json
{"api_key": "gsk_...", "base_url": null}
```

### GET /api/config/active 🔒 admin → `{"provider": "groq"}`

### POST /api/config/active 🔒 admin → `{"provider": "groq"}`

---

## 👥 Utilisateurs

### GET /api/users 🔒 admin — Liste tous les utilisateurs

### POST /api/users 🔒 admin — Crée un utilisateur

### DELETE /api/users/{user_id} 🔒 admin — Supprime (impossible pour `admin`)

---

## 📊 Logs & Statistiques

### GET /api/logs 🔒 admin

| Paramètre | Défaut | Description |
|---|---|---|
| `limit` | 50 | Résultats par page (max 100) |
| `page` | 1 | Numéro de page |
| `action` | — | `chat` \| `upload` \| `delete` |
| `username` | — | Filtrer par utilisateur |

**Réponse :**
```json
{
  "total": 1247, "page": 1, "per_page": 50, "pages": 25,
  "items": [{"id": 1, "username": "john", "action": "chat", "query": "...", "confidence": "Élevé"}]
}
```

---

### GET /api/stats

```json
{
  "total_documents": 47, "total_users": 12, "total_queries": 1247,
  "queries_per_day": {"2025-06-14": 23},
  "confidence_distribution": {"Élevé": 823, "Moyen": 312},
  "top_documents": [{"filename": "procedure.pdf", "count": 145}]
}
```

---

## 🔗 SharePoint

### POST /api/sharepoint/config

```json
{"tenant_id": "...", "client_id": "...", "client_secret": "...", "site_url": "https://company.sharepoint.com/sites/quality", "library_id": "..."}
```

### GET /api/sharepoint/status — Vérifie la configuration

### POST /api/sharepoint/sync — Déclenche une synchronisation (stub)

---

## 🤖 Ollama

### GET /api/ollama/models → `{"models": ["llama3.2", "mistral", "phi3"]}`

---

## 📄 Templates

### GET /api/templates

| Clé | Nom | Type |
|---|---|---|
| `pfmea_blank` | PFMEA structure vierge | PFMEA |
| `audit_iso9001` | Plan audit ISO 9001 | Audit |
