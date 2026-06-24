# Contrôle Anti-Hallucination — QMS Chatbot RAG

## Vue d'ensemble

Le système intègre plusieurs mécanismes complémentaires pour empêcher le LLM de générer des réponses hors documents (hallucinations). Ces mécanismes opèrent à **trois niveaux** : le prompt système, la structure de sortie JSON et le traitement post-génération.

---

## Niveau 1 — Prompt Système Strict (Context-Only)

### Prompt en français (utilisé par défaut)

```
Tu es un assistant documentation QMS. Tu utilises UNIQUEMENT les passages CONTEXT ci-dessous
(numérotés [1], [2], …). N'invente pas d'exigences, numéros de procédure ou données absentes du CONTEXT.
Si le CONTEXT ne permet pas de répondre, mets answer_in_context à false et explique-le clairement dans summary.
Réponds par un seul objet JSON, sans balises markdown, clés exactement :
{"summary": string, "summary_bullets": array of strings, "details": string, "answer_in_context": boolean}
summary : 2–4 phrases. summary_bullets : 3–8 points courts.
details : synthèse structurée en citant les sources [1], [2], etc.
Rédige tout en français.
```

### Prompt en anglais

```
You are a QMS documentation assistant. You ONLY use the CONTEXT passages below
(indexed [1], [2], …). Do not invent procedures, numbers, or requirements not present in CONTEXT.
If CONTEXT does not answer the question, set answer_in_context to false and say so clearly in summary.
Reply with a single JSON object, no markdown fences, keys exactly:
{"summary": string, "summary_bullets": array of strings, "details": string, "answer_in_context": boolean}
summary: 2–4 sentences. summary_bullets: 3–8 concise points.
details: structured synthesis referencing sources like [1], [2].
Write everything in English.
```

### Fichier source : [`llm_rag.py`](../backend/llm_rag.py) — lignes 170–192

---

## Niveau 2 — Structure JSON Forcée + Flag `answer_in_context`

Le LLM est contraint de répondre **uniquement en JSON structuré** avec 4 clés obligatoires :

| Clé | Type | Rôle |
|---|---|---|
| `summary` | `string` | Résumé 2–4 phrases basé sur le contexte |
| `summary_bullets` | `array[string]` | Points clés (3–8 items) |
| `details` | `string` | Synthèse détaillée avec citations `[1]`, `[2]`... |
| `answer_in_context` | `boolean` | **`false`** si la réponse n'est pas dans les documents |

Quand `answer_in_context = false` :
- Le backend force la confiance à **"Faible / Low"**
- Le frontend affiche un message explicite : *"L'information n'est pas disponible dans les documents indexés"*
- La réponse n'est pas présentée comme un fait documentaire

---

## Niveau 3 — Seuils de Filtrage du Retrieval

Avant même que le LLM soit sollicité, des seuils filtrent les chunks non pertinents :

```python
# backend/main.py
MAX_DISTANCE_THRESHOLD = 2.35   # distance cosinus max acceptable (Chroma)
MIN_RELEVANCE_THRESHOLD = 0.12  # exp(-distance) min acceptable
```

La formule de pertinence : `relevance = exp(-distance)`

| Distance | Relevance | Interprétation |
|---|---|---|
| 0.0 | 1.00 | Identique |
| 0.5 | 0.61 | Très similaire |
| 1.0 | 0.37 | Similaire |
| 2.35 | 0.095 | Seuil minimum (filtré si en dessous) |

Si **aucun chunk** ne passe le seuil :
- Le backend répond directement que les documents ne contiennent pas l'information
- Aucun appel LLM n'est effectué (pas de risque d'hallucination)

---

## Niveau 4 — Paramètre de Température Bas

Tous les providers LLM sont configurés avec `temperature=0.15` (valeur très basse) :

```python
# Groq, Gemini, DeepSeek, Ollama — llm_rag.py
temperature=0.15
```

Une température faible réduit la créativité du modèle et le force à coller au contexte fourni plutôt qu'à générer des informations inventées.

---

## Niveau 5 — Citations Numérotées Obligatoires

Le contexte fourni au LLM est numéroté (`[1]`, `[2]`, etc.) et le prompt exige que le LLM **cite ses sources** dans la clé `details`. Cela permet à l'utilisateur de vérifier chaque affirmation en remontant au passage source.

Exemple de contexte fourni :

```
[1] procedure_qualite_ISO9001.pdf — page 3
Le délai maximum pour traiter une action corrective est de 30 jours...

[2] checklist_audit_ISO9001.docx — Clause 10.2
Les non-conformités sont traitées et des actions correctives menées...
```

---

## Niveau 6 — Fallback sur Extraits Bruts

Si le LLM échoue (erreur réseau, JSON mal formé, timeout) :
- Le système bascule automatiquement sur les **extraits bruts des chunks** les plus pertinents
- Aucun texte inventé n'est injecté
- L'utilisateur voit les passages du document tels qu'ils sont indexés

```python
# main.py — mécanisme de fallback
parsed = parse_llm_json(raw)
if not parsed:
    # Fallback : utiliser les extraits bruts des chunks
    return excerpt_fallback(chunks)
```

---

## Résumé des Mécanismes

| Mécanisme | Emplacement | Effet |
|---|---|---|
| Prompt "UNIQUEMENT CONTEXT" | `llm_rag.py` | Interdit au LLM d'utiliser ses connaissances propres |
| Interdiction d'inventer | `llm_rag.py` | Mention explicite "N'invente pas d'exigences" |
| Flag `answer_in_context` | `llm_rag.py` + `main.py` | Détection et signalement des cas hors-contexte |
| Seuil de distance cosinus | `main.py` (MAX_DISTANCE_THRESHOLD) | Bloque les chunks non pertinents avant le LLM |
| Temperature 0.15 | `llm_rag.py` | Réduit la créativité / l'invention |
| Citations `[1][2]` | Prompt + rendu | Traçabilité source par source |
| Fallback extraits bruts | `main.py` | Pas d'invention en cas d'échec LLM |

---

## Exemple de Cas Hors-Contexte

**Question** : *"Quel est le prix des matières premières ?"*

**Réponse générée** :
```json
{
  "summary": "Cette information n'est pas disponible dans les documents de management qualité indexés.",
  "summary_bullets": ["Aucun document ne contient d'information sur les prix des matières premières."],
  "details": "Les documents indexés couvrent uniquement les procédures qualité ISO 9001, les checklists d'audit et les plans de contrôle. Aucun passage ne traite des prix ou des coûts d'approvisionnement.",
  "answer_in_context": false
}
```

**Affichage frontend** : Badge "Confiance : Faible" + message explicite que l'information est hors du domaine documentaire.
