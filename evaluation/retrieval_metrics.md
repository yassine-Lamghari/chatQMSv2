# Métriques d'Évaluation du Retrieval — QMS Chatbot RAG

## Introduction

La qualité d'un système RAG repose sur deux composantes mesurables : la qualité du **retrieval** (les bons documents sont-ils retrouvés ?) et la qualité de la **génération** (la réponse est-elle correcte et fidèle aux sources ?). Ce document décrit les métriques utilisées.

---

## Métriques de Retrieval

### 1. Top-k Accuracy

**Définition** : Le document attendu apparaît-il parmi les `k` premiers résultats retournés ?

$$\text{Top-k Accuracy} = \frac{\text{Nb questions où le doc attendu est dans les k premiers}}{\text{Nb total de questions}}$$

| Métrique | k | Objectif |
|---|---|---|
| Top-1 Accuracy | 1 | ≥ 60% |
| Top-3 Accuracy | 3 | ≥ 80% |
| Top-5 Accuracy | 5 | ≥ 90% |

**Configuration dans le code** : `k=4` par défaut dans `search_similar_chunks()`.

### 2. Recall@k

**Définition** : Parmi tous les passages pertinents connus, combien sont retrouvés dans les `k` premiers résultats ?

$$\text{Recall@k} = \frac{|\text{Passages pertinents retrouvés dans top-k}|}{|\text{Total passages pertinents connus}|}$$

### 3. Score de Similarité Cosinus

Le modèle d'embeddings utilisé est :
- **Modèle** : `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Dimension** : 384
- **Normalisation** : `normalize_embeddings=True` (cosinus normalisé)

La distance retournée par ChromaDB est convertie en score de pertinence :

$$\text{relevance} = e^{-\text{distance}}$$

| Distance cosinus | Score pertinence | Interprétation |
|---|---|---|
| 0.0 | 1.00 | Identique |
| 0.5 | 0.61 | Très similaire |
| 1.0 | 0.37 | Similaire |
| 1.5 | 0.22 | Faiblement similaire |
| 2.35 | 0.095 | **Seuil minimum** (filtré en dessous) |

### 4. Seuils Appliqués

```python
# backend/main.py
MAX_DISTANCE_THRESHOLD = 2.35   # Distance cosinus maximale acceptée
MIN_RELEVANCE_THRESHOLD = 0.12  # Score de pertinence minimum (exp(-distance))
```

Les chunks dont la distance dépasse `2.35` sont **exclus** de la réponse, indépendamment du LLM.

### 5. Score de Confiance Global

Le score de confiance affiché à l'utilisateur est calculé ainsi :

$$\text{confidence\_score} = 0.5 \times \text{avg\_relevance} + 0.3 \times \text{source\_coverage} + 0.2 \times \text{freshness\_score}$$

| Valeur | Niveau affiché |
|---|---|
| ≥ 0.70 | **High** (Élevée) |
| ≥ 0.45 | **Medium** (Moyenne) |
| < 0.45 | **Low** (Faible) |

---

## Architecture du Retrieval Hybride

Le système combine trois méthodes de recherche via **Reciprocal Rank Fusion (RRF)** :

```
                    ┌─────────────────┐
     Question  ───► │ Vector Search   │ (ChromaDB cosinus)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ BM25 Search     │ (tf-idf sur corpus)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ RRF Fusion      │ score = 1/(60 + rank)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Cross-Encoder   │ (optionnel, désactivé par défaut)
                    └────────┬────────┘
                             │
                        Top-k chunks
```

### Formule RRF

$$\text{RRF\_score}(d) = \sum_{r \in \text{rankers}} \frac{1}{60 + \text{rank}_r(d)}$$

### Blending final

$$\text{final\_dist} = 0.7 \times \text{dist\_cosinus} + 0.3 \times \text{pseudo\_dist\_RRF}$$

---

## Cas : Aucun Document Pertinent

Quand aucun chunk ne dépasse le seuil de pertinence minimum :

1. Le backend détecte que la liste de chunks pertinents est vide
2. Aucun appel LLM n'est effectué
3. La réponse retournée contient `answer_in_context: false`
4. Le frontend affiche : *"L'information demandée n'est pas disponible dans les documents indexés"*
5. Le niveau de confiance est forcé à **Low**

---

## Jeu d'Évaluation

Le fichier [`evaluation/qa_evaluation.csv`](qa_evaluation.csv) contient 18 questions de test réparties en :

| Catégorie | Nb questions | Documents cibles |
|---|---|---|
| Procédure qualité ISO 9001 | 6 | `procedure_qualite_ISO9001.pdf` |
| Checklist audit | 2 | `checklist_audit_ISO9001.docx` |
| Formation qualité | 3 | `formation_qualite_ISO9001.pptx` |
| Plan de contrôle / KPI | 4 | `plan_controle_qualite.xlsx` |
| Questions multi-documents | 1 | PDF + DOCX |
| Questions hors-contexte | 2 | — (test anti-hallucination) |

---

## Script d'Évaluation Automatique

Le script [`evaluate_retrieval.py`](evaluate_retrieval.py) permet de calculer automatiquement les métriques sur le jeu de test.

### Exécution

```bash
# Depuis le dossier racine du projet
cd backend
..\backend\venv\Scripts\python.exe ..\evaluation\evaluate_retrieval.py
```

### Sorties

- Rapport console avec Top-1, Top-3, Top-5 Accuracy
- Fichier `evaluation/results_YYYY-MM-DD.csv` avec les scores détaillés par question
