# Configuration file for the Sphinx documentation builder.
# https://www.sphinx-doc.org/en/master/usage/configuration.html

import os
import sys

# -- Project information -----------------------------------------------------
project = 'QMS Chatbot v2'
copyright = '2026, Yassine Lamghari'
author = 'Yassine Lamghari'
release = '2.0.0'
version = '2.0'

# -- General configuration ---------------------------------------------------
extensions = [
    'myst_parser',            # Markdown support
    'sphinx.ext.autodoc',     # Auto-doc from docstrings
    'sphinx.ext.viewcode',    # Source code links
    'sphinx.ext.napoleon',    # Google/NumPy docstrings
    'sphinx.ext.intersphinx', # Cross-project links
    'sphinx_copybutton',      # Copy button on code blocks
    'sphinx_design',          # Cards, tabs, badges
]

# MyST Parser options (Markdown)
myst_enable_extensions = [
    "colon_fence",
    "deflist",
    "fieldlist",
    "html_admonition",
    "html_image",
    "replacements",
    "smartquotes",
    "strikethrough",
    "tasklist",
]
myst_heading_anchors = 4

# Source file suffixes
source_suffix = {
    '.rst': 'restructuredtext',
    '.md': 'markdown',
}

# The master toctree document
master_doc = 'index'

# Templates
templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

# Language
language = 'fr'

# -- Options for HTML output -------------------------------------------------
html_theme = 'sphinx_rtd_theme'

html_theme_options = {
    'logo_only': False,
    'display_version': True,
    'prev_next_buttons_location': 'bottom',
    'style_external_links': True,
    'collapse_navigation': False,
    'sticky_navigation': True,
    'navigation_depth': 4,
    'includehidden': True,
    'titles_only': False,
    'style_nav_header_background': '#1e293b',
}

html_title = 'QMS Chatbot v2 — Documentation'
html_short_title = 'QMS Chatbot v2'

html_static_path = ['_static']
html_css_files = ['custom.css']

html_context = {
    'display_github': True,
    'github_user': 'yassine-Lamghari',
    'github_repo': 'chatQMSv2',
    'github_version': 'main',
    'conf_py_path': '/docs/',
}

# -- Intersphinx mapping -----------------------------------------------------
intersphinx_mapping = {
    'python': ('https://docs.python.org/3', None),
    'fastapi': ('https://fastapi.tiangolo.com', None),
}

# -- Copy button config ------------------------------------------------------
copybutton_prompt_text = r'>>> |\.\.\. |\$ |# '
copybutton_prompt_is_regexp = True
