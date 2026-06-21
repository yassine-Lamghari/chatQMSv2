# Vue d'ensemble

## Qu'est-ce que QMS Chatbot v2 ?

**QMS Chatbot v2** est une application web fullstack permettant aux équipes qualité de **consulter leur base documentaire en langage naturel** grâce à un pipeline RAG (Retrieval-Augmented Generation). Il centralise les documents QMS, les rend intelligemment interrogeables, et propose des outils spécialisés pour les audits et l'analyse PFMEA.

```{admonition} Principe fondamental
:class: note

Le chatbot répond **uniquement** à partir des documents que vous avez importés. Il ne génère jamais d'informations inventées (hallucinations) — si l'information n'est pas dans vos documents, il vous le dit clairement.
```

## Cas d'usage principaux

| Cas d'usage | Module | Description |
|---|---|---|
| **Chat documentaire** | `/` | Questions en langage naturel sur les procédures, normes, instructions |
| **Audit assisté** | `/audit` | Checklists ISO 9001 / IATF 16949 contextualisées par processus |
| **PFMEA assisté** | `/pfmea` | Tableaux AMDEC Process enrichis par l'IA |
| **Recherche sémantique** | `/search` | Recherche par sens dans tous les documents |
| **Traçabilité** | `/logs` | Journal d'activité pour conformité qualité |
| **Administration** | `/admin` | Gestion des documents, LLMs et utilisateurs |

## Fonctionnement en bref

```{mermaid}
graph LR
    A([👤 Utilisateur]) -->|Question| B[Frontend\nNext.js]
    B -->|POST /api/chat| C[Backend\nFastAPI]
    C -->|Recherche| D[(ChromaDB\nVecteurs)]
    D -->|Passages pertinents| C
    C -->|Synthèse| E{LLM}
    E -->|Réponse JSON| C
    C -->|Résumé + Sources| B
    B -->|Affichage| A
```

## Pré-requis système

| Composant | Version minimale | Recommandé |
|---|---|---|
| **Python** | 3.11 | 3.12 |
| **Node.js** | 18 | 20+ |
| **npm** | 9 | 10+ |
| **RAM libre** | 2 Go | 4 Go |
| **Disque** | 2 Go | 5 Go |
| **OS** | Windows 10+ / Linux / macOS | — |

## Formats de documents supportés

| Format | Extension | Notes |
|---|---|---|
| PDF | `.pdf` | Texte + extraction d'images (nécessite PyMuPDF) |
| Word | `.docx`, `.doc` | Via Docx2txt |
| Excel | `.xlsx`, `.xls` | Chaque feuille → document séparé |
| PowerPoint | `.pptx`, `.ppt` | Chaque diapo → document séparé |
| Images | `.png`, `.jpg`, `.jpeg` | Indexées comme chunks visuels |

## Providers LLM supportés

| Provider | Type | Modèle par défaut |
|---|---|---|
| **Groq** | Cloud (gratuit) | `llama-3.1-8b-instant` |
| **Gemini** | Cloud (Google) | `gemini-2.0-flash` |
| **DeepSeek** | Cloud | `deepseek-chat` |
| **Ollama** | Local (100% privé) | `llama3.2` |

```{tip}
Pour les données sensibles, utilisez **Ollama** : le LLM tourne entièrement sur votre machine, aucune donnée ne quitte votre infrastructure.
```
