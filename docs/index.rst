.. QMS Chatbot v2 documentation master file

QMS Chatbot v2 — Documentation officielle
==========================================

.. image:: https://img.shields.io/badge/version-2.0.0-blue.svg
   :alt: Version 2.0.0

.. image:: https://img.shields.io/badge/python-3.11+-green.svg
   :alt: Python 3.11+

.. image:: https://img.shields.io/badge/Next.js-16-black.svg
   :alt: Next.js 16

.. image:: https://img.shields.io/badge/FastAPI-0.x-teal.svg
   :alt: FastAPI

.. image:: https://readthedocs.org/projects/chatqmsv2/badge/?version=latest
   :target: https://chatqmsv2.readthedocs.io/fr/latest/?badge=latest
   :alt: Documentation Status

----

**QMS Chatbot v2** est un système intelligent de gestion documentaire qualité.
Il permet aux équipes qualité de consulter leur base documentaire en langage naturel
grâce à un pipeline RAG (Retrieval-Augmented Generation), et propose des outils
spécialisés pour les audits ISO 9001 / IATF 16949 et la génération PFMEA/AMDEC.

.. grid:: 2
   :gutter: 3

   .. grid-item-card:: 🚀 Démarrage rapide
      :link: installation
      :link-type: doc

      Installez et lancez l'application en quelques minutes.

   .. grid-item-card:: 🔍 Pipeline RAG
      :link: rag_pipeline
      :link-type: doc

      Comprenez le cœur technique du système de recherche hybride.

   .. grid-item-card:: 📡 Référence API
      :link: api_reference
      :link-type: doc

      Documentation complète des 35+ endpoints REST.

   .. grid-item-card:: 🛠️ Guide développeur
      :link: developer_guide
      :link-type: doc

      Étendez et personnalisez l'application.

----

.. toctree::
   :maxdepth: 2
   :caption: 📖 Guide utilisateur
   :hidden:

   overview
   installation
   configuration

.. toctree::
   :maxdepth: 2
   :caption: 🏗️ Architecture & Technique
   :hidden:

   architecture
   rag_pipeline
   data_model

.. toctree::
   :maxdepth: 2
   :caption: 📡 Référence
   :hidden:

   api_reference
   modules
   frontend

.. toctree::
   :maxdepth: 2
   :caption: 🔒 Sécurité & Ops
   :hidden:

   security
   developer_guide
   troubleshooting

.. toctree::
   :maxdepth: 1
   :caption: 📚 Annexes
   :hidden:

   glossary
   changelog
