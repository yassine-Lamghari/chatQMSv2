# Pipeline RAG — Référence technique

Le pipeline RAG (Retrieval-Augmented Generation) est le cœur du système. Il combine recherche documentaire et génération LLM pour produire des réponses fondées sur les documents de l'entreprise.

## Vue d'ensemble du pipeline

```
Question utilisateur
       │
       ▼
┌─────────────────────────────────────┐
│         Recherche Hybride               │
│                                         │
│  1. Vectorielle (ChromaDB cosinus)      │
│  2. BM25 (implémentation custom)        │
│  3. RRF — Reciprocal Rank Fusion        │
└─────────────────┬───────────────────────┘
                  │ top-k passages
                  ▼
┌─────────────────────────────────────────┐
│         Filtrage & Scoring              │
│                                         │
│  • Distance max ≤ 2.35                  │
│  • Relevance min ≥ 0.12                 │
│  • Criticité (admin only pour Critical) │
│  • Filtres date / site                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Synthèse LLM                    │
│                                         │
│  Contexte numéroté [1], [2]...          │
│  Prompt système strict (grounded)       │
│  Retour JSON structuré                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
      Réponse + Sources + Confiance
```

## Ingestion des documents

### Découpage (chunking)

Le découpage utilise `RecursiveCharacterTextSplitter` avec une hiérarchie de séparateurs respectant la structure naturelle des documents QMS :

| Paramètre | Valeur | Raison |
|---|---|---|
| `chunk_size` | 900 chars | Assez grand pour conserver le contexte d'un paragraphe |
| `chunk_overlap` | 220 chars | Évite de couper les phrases à cheval |
| `separators` | `["\n\n", "\n", ". ", " ", ""]` | Préfère couper aux paragraphes/phrases |

### Chargeurs par format

| Format | Chargeur | Notes |
|---|---|---|
| `.pdf` | `PyPDFLoader` | + extraction d'images via PyMuPDF |
| `.docx`, `.doc` | `Docx2txtLoader` | |
| `.xlsx`, `.xls` | `openpyxl` (custom) | Chaque feuille → document |
| `.pptx`, `.ppt` | `python-pptx` (custom) | Chaque diapo → document |
| `.png`, `.jpg` | Indexation directe | Chunk visuel avec description |

### Extraction d'images PDF

Pour les PDFs, les images sont extraites via **PyMuPDF** (fitz) et indexées comme chunks séparés avec un texte descriptif :

```
[IMAGE] Page 3 — Diagramme ou figure dans le document procedure.pdf.
Cette image est un diagramme, schema, figure, graphique ou illustration
extraite de la page 3.
```

Les images < `RAG_MIN_IMAGE_BYTES` (défaut : 3000 octets) sont ignorées pour éviter les icônes et logos.

## Modèle d'embedding

| Propriété | Valeur |
|---|---|
| **Identifiant** | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |
| **Taille sur disque** | ~457 MB |
| **Dimensions** | 384 |
| **Langues supportées** | 50+ (FR, EN, DE, ES, AR, ZH...) |
| **Normalisation** | `normalize_embeddings=True` (similarité cosinus correcte) |
| **Chargement** | Lazy singleton, arrière-plan au démarrage |

```{tip}
Le modèle multilingue permet à une requête en **français** de retrouver des passages pertinents dans des documents en **anglais** et vice-versa, sans configuration supplémentaire.
```

## Recherche hybride — Détail

### Étape 1 : Recherche vectorielle

```python
vector_hits = chroma.similarity_search_with_score(
    query,
    k=48,  # fetch_multiplier=6 × top_k
    filter=metadata_filter
)
# Distance cosinus normalisée ∈ [0, ∞[
# Plus petit = plus pertinent
```

### Étape 2 : BM25 (lexicale)

Implémentation custom `SimpleBM25` (k1=1.5, b=0.75) :

$$\text{BM25}(q, d) = \sum_{t \in q} \text{IDF}(t) \cdot \frac{tf(t,d) \cdot (k_1+1)}{tf(t,d) + k_1 \cdot (1 - b + b \cdot \frac{|d|}{avgdl})}$$

Où $\text{IDF}(t) = \log\left(1 + \frac{N - df_t + 0.5}{df_t + 0.5}\right)$

### Étape 3 : Reciprocal Rank Fusion (RRF)

$$\text{RRF}(d) = \sum_{r \in \text{rankers}} \frac{1}{60 + \text{rank}_r(d)}$$

Fusion des scores finaux :

$$\text{dist}_{final} = \begin{cases} 0.7 \times d_{cosinus} + 0.3 \times d_{rrf} & \text{si dans les deux listes} \\ d_{rrf} & \text{BM25 uniquement} \end{cases}$$

### Étape 4 : Cross-encoder reranker (optionnel)

Désactivé par défaut (`RAG_ENABLE_RERANKER=0`). Si activé :
- **Modèle :** `cross-encoder/ms-marco-MiniLM-L-6-v2`
- **Score final :** $0.75 \times d_{ce} + 0.25 \times d_{blended}$

## Seuils de pertinence

```python
MAX_DISTANCE_THRESHOLD = 2.35   # Écarte distance > 2.35
MIN_RELEVANCE_THRESHOLD = 0.12  # Écarte relevance < 0.12

# Conversion distance → relevance :
relevance = exp(-distance)  # ∈ [0, 1], 1 = parfait
```

## Score de confiance

$$\text{Confiance} = 0.5 \times \overline{\text{relevance}} + 0.3 \times \frac{\min(|\text{sources}|, 3)}{3} + 0.2 \times \text{fraîcheur}$$

Où la **fraîcheur** d'un document est :
$$\text{fraîcheur} = \max\left(0.1, 1 - \frac{\text{âge en jours}}{365}\right)$$

| Score | FR | EN |
|---|---|---|
| ≥ 0.70 | **Élevé** | High |
| ≥ 0.45 | **Moyen** | Medium |
| < 0.45 | **Faible** | Low |

## Synthèse LLM

### Format du contexte

```
[1] procedure_reception.pdf — § page 3
3.1 Contrôle à réception — Le contrôle visuel est effectué...

---

[2] instruction_mesure.docx — section (page metadata n/a)
Les mesures dimensionnelles sont réalisées selon AQL 2.5...
```

### Prompt système (français)

```
Tu es un assistant documentation QMS. Tu utilises UNIQUEMENT les passages
CONTEXT ci-dessous (numérotés [1], [2]...). N'invente pas d'exigences,
numéros de procédure ou données absentes du CONTEXT.
Si le CONTEXT ne permet pas de répondre, mets answer_in_context à false.

Réponds par un seul objet JSON, sans balises markdown, clés exactement :
{"summary": string, "summary_bullets": array, "details": string, "answer_in_context": boolean}
```

### Réponse JSON structurée

```json
{
  "summary": "La procédure PR-QC-001 prévoit trois étapes de contrôle...",
  "summary_bullets": [
    "Contrôle visuel à réception (fiche PR-001)",
    "Mesure dimensionnelle sur échantillon (AQL 2.5)",
    "Validation par le responsable qualité"
  ],
  "details": "D'après [1], le contrôle visuel comprend... D'après [2], les AQL...",
  "answer_in_context": true
}
```

## Modes de langue

| Mode | Comportement |
|---|---|
| `document_language` | Le LLM répond dans la langue des documents (défaut) |
| `en_only` | Force les réponses en anglais |
| `fr_with_en_sources` | Réponse en français, sources citées en anglais |
