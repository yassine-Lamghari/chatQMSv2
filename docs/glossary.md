# Glossaire

## Termes techniques IA & RAG

**BM25 (Best Match 25)**
: Algorithme de ranking lexical fondé sur la fréquence des termes (TF) et la fréquence inverse dans les documents (IDF). Paramètres : k1=1.5, b=0.75.

**ChromaDB**
: Base de données vectorielle open-source persistante. Stocke les vecteurs d'embedding et permet des recherches par similarité cosinus.

**Chunk**
: Fragment de document découpé pour l'indexation. Dans ce projet : 900 caractères avec un chevauchement (overlap) de 220 caractères.

**Cross-encoder**
: Modèle de reranking plus précis qu'un bi-encoder. Réévalue chaque paire (question, passage) ensemble. Désactivé par défaut (CPU intensif).

**Embedding**
: Représentation numérique d'un texte sous forme de vecteur dans un espace à 384 dimensions. Les textes sémantiquement proches ont des vecteurs proches.

**Fernet**
: Schéma de chiffrement symétrique de la bibliothèque Python `cryptography`. AES-128-CBC + HMAC-SHA256. Génère des tokens base64 URL-safe.

**Hallucination (LLM)**
: Génération par un LLM d'informations fausses présentées comme vraies. Évitée ici en forçant le LLM à ne répondre qu'à partir du contexte documenté.

**JWT (JSON Web Token)**
: Standard RFC 7519 d'authentification par token signé. Payload : `{sub, role, site, exp}`. Signé avec HMAC-SHA256.

**LLM (Large Language Model)**
: Grand modèle de langage capable de générer du texte cohérent. Dans ce projet : Groq (Llama), Gemini, DeepSeek ou Ollama.

**RAG (Retrieval-Augmented Generation)**
: Architecture IA combinant recherche documentaire et génération LLM. La réponse est générée à partir de passages pertinents récupérés dans une base de documents.

**RRF (Reciprocal Rank Fusion)**
: Technique de fusion de résultats de plusieurs moteurs de recherche.
Score : $\frac{1}{60 + \text{rang}}$ pour chaque liste, additionnés.

**sentence-transformers**
: Bibliothèque Python pour générer des embeddings de phrases. Modèle : `paraphrase-multilingual-MiniLM-L12-v2` (50+ langues, 384 dimensions).

**Similarité cosinus**
: Mesure de similarité entre deux vecteurs basée sur l'angle. Vaut 1 pour des vecteurs identiques. Convertie en distance : $d = 1 - \cos\_sim$.

---

## Termes QMS & Qualité

**AMDEC / PFMEA**
: Analyse des Modes de Défaillance, de leurs Effets et de leur Criticité. Outil préventif pour identifier les risques dans un processus de fabrication.

**AQL (Acceptable Quality Level)**
: Niveau de qualité acceptable. Définit le pourcentage maximum de défectueux toléré dans un échantillon (ex: AQL 2.5 = 2.5%).

**IATF 16949**
: Standard qualité pour l'industrie automobile, dérivé de l'ISO 9001 avec des exigences supplémentaires (FMEA, plans de contrôle, exigences clients spécifiques).

**ISO 9001**
: Norme internationale de management de la qualité. 10 chapitres (contexte, leadership, planification, support, opérations, évaluation, amélioration).

**QMS (Quality Management System)**
: Système de Management de la Qualité. Ensemble des processus, procédures et ressources pour garantir la qualité des produits et services.

**RPN (Risk Priority Number)**
: Indice de priorité de risque PFMEA : $RPN = S \times O \times D$
- **S** (Severity) : Gravité (1–10)
- **O** (Occurrence) : Fréquence (1–10)
- **D** (Detection) : Détectabilité (1–10)
- RPN > 200 → action prioritaire requise

---

## Termes système

**bcrypt**
: Algorithme de hachage de mots de passe adaptatif (résistant aux attaques GPU). Inclut le salt dans le hash stocké.

**CORS**
: Cross-Origin Resource Sharing. Mécanisme de sécurité des navigateurs contrôlant quels domaines peuvent accéder à l'API.

**Criticité documentaire**
: Niveau d'importance : `Low` < `Medium` < `High` < `Critical`. Les documents `Critical` sont réservés aux administrateurs.

**FastAPI**
: Framework Python moderne pour APIs REST. Basé sur Starlette + Pydantic. Support natif async, doc Swagger auto-générée.

**Multi-tenant**
: Architecture permettant à plusieurs sites d'utiliser la même instance avec des données isolées via le champ `site`.

**Rate Limiting**
: Limitation du nombre de requêtes par IP par unité de temps. Implémenté via slowapi. Retourne `429 Too Many Requests` si dépassé.

**SQLAlchemy**
: ORM Python (Object-Relational Mapping). Permet de manipuler SQLite via des classes Python. Version 2.0 avec `DeclarativeBase`.
