"""
Script d'evaluation complet : importe les docs de test puis interroge
le chatbot pour chaque question du jeu d'evaluation et remplit
les colonnes 'Reponse_chatbot' et 'Score'.

Usage :
    cd "C:\\Users\\ASUS ROG\\Desktop\\chat"
    .\\backend\\venv\\Scripts\\python.exe run_evaluation.py

Prerequis : le backend doit tourner sur http://localhost:8000
"""

import csv
import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error

BASE_URL = "http://localhost:8000"
QA_FILE  = os.path.join("evaluation", "qa_evaluation.csv")
OUT_FILE = os.path.join("evaluation", "qa_evaluation_completed.csv")
DOCS_DIR = "docs_test"

ADMIN_USER = "admin"
ADMIN_PASS = "admin123"   # ajuster si necessaire

# ─── helpers HTTP ──────────────────────────────────────────────────────────────

def _req(method, path, body=None, headers=None, token=None, timeout=60):
    url = BASE_URL + path
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    if headers:
        h.update(headers)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        txt = e.read().decode(errors="replace")
        return {"_error": e.code, "_msg": txt[:300]}
    except Exception as e:
        return {"_error": str(e)}

def _post(path, body, token=None, timeout=60):
    return _req("POST", path, body, token=token, timeout=timeout)

def _get(path, token=None):
    return _req("GET", path, token=token)

# ─── 1. Login ──────────────────────────────────────────────────────────────────

def login(username, password):
    resp = _post("/api/auth/login", {"username": username, "password": password})
    tok = resp.get("token") or resp.get("access_token")
    if not tok:
        print(f"  [WARN] Login echoue : {resp}")
    return tok

# ─── 2. Verifier / importer les documents ─────────────────────────────────────

def get_existing_docs(token):
    docs = _get("/api/documents", token=token)
    if isinstance(docs, list):
        return {d.get("filename", ""): d.get("id") for d in docs}
    return {}

def upload_doc(filepath, token):
    import urllib.request
    filename = os.path.basename(filepath)
    # Determiner doc_type
    ext = os.path.splitext(filename)[1].lower()
    type_map = {".pdf":"Procedure", ".docx":"Checklist", ".xlsx":"Plan de controle",
                ".pptx":"Formation", ".png":"Schéma"}
    doc_type = type_map.get(ext, "Document")
    crit_map = {".pdf":"High", ".docx":"Medium", ".xlsx":"High",
                ".pptx":"Low", ".png":"Low"}
    criticality = crit_map.get(ext, "Low")

    # Multipart upload manuel
    boundary = "----FormBoundary7MA4YWxkTrZu0gW"
    with open(filepath, "rb") as f:
        file_data = f.read()

    body_parts = []
    fields = {
        "doc_type": doc_type,
        "criticality": criticality,
        "version": "1.0",
        "owner": "Responsable Qualite",
        "language": "fr",
        "site": "default",
    }
    for k, v in fields.items():
        body_parts.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}".encode()
        )

    body_parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
        f"filename=\"{filename}\"\r\nContent-Type: application/octet-stream\r\n\r\n".encode()
        + file_data
    )
    body_parts.append(f"--{boundary}--\r\n".encode())
    body = b"\r\n".join(body_parts)

    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Content-Length": str(len(body)),
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        BASE_URL + "/api/documents",
        data=body, headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        txt = e.read().decode(errors="replace")
        return {"_error": e.code, "_msg": txt[:300]}
    except Exception as e:
        return {"_error": str(e)}

def ensure_docs_imported(token):
    print("\n[ETAPE 1] Verification / Import des documents de test...")
    existing = get_existing_docs(token)
    print(f"  Documents deja indexes : {list(existing.keys()) or 'aucun'}")

    files = [f for f in os.listdir(DOCS_DIR)
             if not f.startswith(".") and not f.endswith(".md")]

    for fname in sorted(files):
        if fname in existing:
            print(f"  [SKIP] {fname} (deja present)")
            continue
        fpath = os.path.join(DOCS_DIR, fname)
        print(f"  [UPLOAD] {fname} ...", end="", flush=True)
        resp = upload_doc(fpath, token)
        if "_error" in resp:
            print(f" ERREUR : {resp}")
        else:
            print(f" OK (id={resp.get('id', '?')})")
        time.sleep(2)  # laisser le temps a l'indexation

    print("  Attente indexation ChromaDB (10s)...")
    time.sleep(10)

# ─── 3. Interroger le chatbot ──────────────────────────────────────────────────

def ask_chatbot(question, token=None):
    payload = {
        "query": question,
        "top_k": 5,
        "language_mode": "document_language",
        "respond_in_english": False,
        "response_locale": "fr",
        "user_role": "admin",
        "use_llm": True,
        "username": "evaluateur",
        "filters": {},
    }
    resp = _post("/api/chat", payload, token=token, timeout=120)
    if "_error" in resp:
        return None, f"ERREUR API : {resp['_error']} — {resp.get('_msg','')}"

    summary = resp.get("summary") or resp.get("answer") or ""
    bullets = resp.get("summary_bullets") or []
    answer_in_ctx = resp.get("answer_in_context", True)
    sources = resp.get("sources") or []
    confidence = resp.get("confidence", "")

    if not answer_in_ctx:
        chatbot_text = (
            "[HORS CONTEXTE] " + summary if summary
            else "Information non disponible dans les documents indexes."
        )
    else:
        parts = [summary]
        if bullets:
            parts.append("Points cles : " + " | ".join(bullets[:3]))
        chatbot_text = " — ".join(p for p in parts if p)

    return resp, chatbot_text

# ─── 4. Calculer le score ──────────────────────────────────────────────────────

def compute_score(qa_row, chatbot_resp, chatbot_text):
    """
    Score simple heuristique (0.0 a 1.0) :
    - 0.5 : document attendu retrouve dans les sources
    - 0.3 : mots-cles du passage attendu presents dans la reponse
    - 0.2 : answer_in_context correct (True si attendu, False si hors-contexte)
    """
    if chatbot_resp is None:
        return 0.0

    expected_doc   = qa_row.get("Document_attendu", "").lower()
    expected_pass  = qa_row.get("Passage_attendu", "").lower()
    expected_ans   = qa_row.get("Reponse_attendue", "").lower()
    is_oc_question = expected_doc.startswith("--") or expected_doc == ""

    score = 0.0
    answer_in_ctx = chatbot_resp.get("answer_in_context", True)
    sources = chatbot_resp.get("sources") or []
    source_files = " ".join(
        (s.get("filename") or "").lower() for s in sources
    )

    # Critere 1 : document correct retrouve (0.5)
    if is_oc_question:
        # Question hors contexte : on attend answer_in_context=False
        if not answer_in_ctx:
            score += 0.5
    else:
        # Verifier que le doc attendu figure dans les sources
        doc_tokens = [t for t in expected_doc.replace("/", " ").split() if len(t) > 3]
        if doc_tokens and any(t in source_files for t in doc_tokens):
            score += 0.5
        elif not sources and not is_oc_question:
            score += 0.0

    # Critere 2 : mots-cles du passage attendu dans la reponse (0.3)
    if expected_pass and chatbot_text:
        # Extraire les mots importants (>4 chars)
        keywords = [w for w in expected_pass.split()
                    if len(w) > 4 and w.isalpha()][:8]
        if keywords:
            resp_lower = chatbot_text.lower()
            hits = sum(1 for kw in keywords if kw in resp_lower)
            score += 0.3 * (hits / len(keywords))

    # Critere 3 : coherence answer_in_context (0.2)
    if is_oc_question:
        if not answer_in_ctx:
            score += 0.2
    else:
        if answer_in_ctx:
            score += 0.2

    return round(min(score, 1.0), 2)

# ─── 5. Main ───────────────────────────────────────────────────────────────────

def main():
    print("=" * 65)
    print("EVALUATION COMPLETE DU CHATBOT QMS RAG")
    print("=" * 65)

    # Connexion
    print("\n[AUTH] Connexion au backend...")
    token = login(ADMIN_USER, ADMIN_PASS)
    if not token:
        # Essayer sans token (endpoint sans auth)
        print("  Connexion sans token JWT...")
        token = None

    # Import des documents
    ensure_docs_imported(token)

    # Charger le jeu Q&R
    with open(QA_FILE, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"\n[ETAPE 2] Interrogation du chatbot sur {len(rows)} questions...\n")

    results = []
    scores = []

    for i, row in enumerate(rows, 1):
        question = row.get("Question", "").strip()
        expected_doc = row.get("Document_attendu", "").strip()
        is_oc = expected_doc.startswith("--") or expected_doc == ""

        print(f"[{i:02d}/{len(rows)}] {question[:72]}...")

        chatbot_resp, chatbot_text = ask_chatbot(question, token)
        score = compute_score(row, chatbot_resp, chatbot_text)
        scores.append(score)

        sources_str = ""
        if chatbot_resp and chatbot_resp.get("sources"):
            sources_str = ", ".join(
                s.get("filename", "?")
                for s in chatbot_resp["sources"][:3]
            )
        confidence = (chatbot_resp or {}).get("confidence", "?")

        print(f"        Score: {score:.2f} | Confiance: {confidence} | Sources: {sources_str or 'aucune'}")

        results.append({
            "Question": question,
            "Document_attendu": row.get("Document_attendu", ""),
            "Passage_attendu": row.get("Passage_attendu", ""),
            "Reponse_attendue": row.get("Reponse_attendue", ""),
            "Reponse_chatbot": chatbot_text,
            "Score": score,
            "Confiance_systeme": confidence,
            "Sources_retournees": sources_str,
            "Answer_in_context": (chatbot_resp or {}).get("answer_in_context", "?"),
        })

        time.sleep(1.5)  # throttle

    # ── Rapport final ─────────────────────────────────────────────────────────
    avg = sum(scores) / len(scores) if scores else 0
    print("\n" + "=" * 65)
    print(f"SCORE MOYEN GLOBAL : {avg:.2f} / 1.00  ({avg*100:.1f}%)")
    excellent = sum(1 for s in scores if s >= 0.8)
    bon       = sum(1 for s in scores if 0.5 <= s < 0.8)
    faible    = sum(1 for s in scores if s < 0.5)
    print(f"  Excellent (>=0.8) : {excellent} questions")
    print(f"  Bon      (>=0.5)  : {bon} questions")
    print(f"  Faible   (<0.5)   : {faible} questions")
    print("=" * 65)

    # Sauvegarder CSV complet
    fieldnames = ["Question", "Document_attendu", "Passage_attendu",
                  "Reponse_attendue", "Reponse_chatbot", "Score",
                  "Confiance_systeme", "Sources_retournees", "Answer_in_context"]
    with open(OUT_FILE, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"\n[OK] Fichier complete sauvegarde : {OUT_FILE}")
    print("     Ouvrez-le dans Excel pour consulter les resultats.")

if __name__ == "__main__":
    main()
