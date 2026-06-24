# Corpus de Documents de Test — QMS Chatbot RAG

Ce dossier contient les documents utilisés pour tester et valider le système RAG.

## Formats testés

| Fichier | Format | Contenu | Criticité |
|---|---|---|---|
| `procedure_qualite_ISO9001.pdf` | PDF texte | Procédure qualité complète ISO 9001:2015 (8 sections) | High |
| `checklist_audit_ISO9001.docx` | Word (DOCX) | Checklist d'audit interne par clause ISO 9001 | Medium |
| `plan_controle_qualite.xlsx` | Excel (XLSX) | Plan de contrôle (11 étapes) + tableau KPI 2024 | High |
| `formation_qualite_ISO9001.pptx` | PowerPoint (PPTX) | Support de formation (6 slides) | Low |
| `schema_processus_qualite.png` | Image (PNG) | Schéma de processus qualité | Low |

## Utilisation

Ces documents doivent être importés dans l'application via l'interface d'administration :
1. Connectez-vous avec un compte **admin**
2. Allez dans **Gestion des documents**
3. Importez chaque fichier avec les métadonnées appropriées
4. Vérifiez l'indexation dans ChromaDB

## Couverture des formats

| Format | Support annoncé | Document de test fourni | Testé |
|---|---|---|---|
| PDF (texte natif) | ✅ | `procedure_qualite_ISO9001.pdf` | ✅ |
| PDF (scanné/OCR) | ⚠️ Via PyMuPDF (images extraites) | — | Partiel |
| Word (.docx) | ✅ | `checklist_audit_ISO9001.docx` | ✅ |
| Excel (.xlsx) | ✅ | `plan_controle_qualite.xlsx` | ✅ |
| PowerPoint (.pptx) | ✅ | `formation_qualite_ISO9001.pptx` | ✅ |
| Image (.png/.jpg) | ✅ | `schema_processus_qualite.png` | ✅ |

> **Note** : Les PDF scannés sont traités via l'extraction d'images PyMuPDF.
> Le contenu textuel des PDF scannés n'est pas extrait par OCR dans la version actuelle.
