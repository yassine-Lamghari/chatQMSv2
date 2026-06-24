"""
Script d'évaluation automatique du retrieval RAG — QMS Chatbot
Calcule : Top-1, Top-3, Top-5 Accuracy + Recall@k sur le jeu de Q&R.

Usage :
    cd evaluation
    python evaluate_retrieval.py

Prérequis :
    - Le backend doit être accessible (ou lancer depuis le dossier backend/)
    - Les documents du corpus docs_test/ doivent être importés dans l'app
"""

import csv
import sys
import os
import datetime
import json

# Ajouter le backend au path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)

QA_FILE = os.path.join(SCRIPT_DIR, "qa_evaluation.csv")
RESULTS_DIR = SCRIPT_DIR


def load_qa_pairs():
    pairs = []
    with open(QA_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pairs.append(row)
    return pairs


def check_doc_in_results(expected_doc: str, chunks) -> bool:
    """Vérifie si le document attendu figure parmi les chunks retournés."""
    if not expected_doc or expected_doc.startswith("--"):
        return None  # Cas hors-contexte, pas évaluable pour le retrieval
    expected_lower = expected_doc.lower()
    for doc, _dist in chunks:
        meta = doc.metadata or {}
        filename = (meta.get("filename") or "").lower()
        source = (meta.get("source") or "").lower()
        if any(part in filename or part in source
               for part in expected_lower.replace(" /", "").split("/")):
            return True
    return False


def evaluate():
    print("=" * 70)
    print("EVALUATION DU RETRIEVAL RAG — QMS Chatbot")
    print("=" * 70)
    print()

    # Charger les fonctions de recherche
    try:
        os.chdir(BACKEND_DIR)
        from rag import search_similar_chunks
        print("[OK] Module RAG charge depuis", BACKEND_DIR)
    except ImportError as e:
        print(f"[ERREUR] Impossible de charger le module RAG : {e}")
        print("Verifiez que vous executez depuis le dossier du projet avec le venv active.")
        sys.exit(1)

    qa_pairs = load_qa_pairs()
    print(f"[INFO] {len(qa_pairs)} questions chargees depuis {QA_FILE}")
    print()

    results = []
    top1_hits = 0
    top3_hits = 0
    top5_hits = 0
    out_of_context_correct = 0
    evaluable_count = 0
    out_of_context_count = 0

    for i, qa in enumerate(qa_pairs, 1):
        question = qa.get("Question", "").strip()
        expected_doc = qa.get("Document_attendu", "").strip()
        expected_passage = qa.get("Passage_attendu", "").strip()
        expected_answer = qa.get("Reponse_attendue", "").strip()

        is_out_of_context = expected_doc.startswith("--") or expected_doc == ""

        print(f"[{i:02d}/{len(qa_pairs)}] {question[:70]}...")

        try:
            # Retrieval avec k=5 pour mesurer Top-1, Top-3, Top-5
            chunks_5 = search_similar_chunks(question, k=5)

            if is_out_of_context:
                out_of_context_count += 1
                # Pour les questions hors-contexte, vérifier que les distances sont élevées
                avg_dist = sum(d for _, d in chunks_5) / max(len(chunks_5), 1) if chunks_5 else 999
                is_correctly_low_relevance = avg_dist > 1.5 or len(chunks_5) == 0
                if is_correctly_low_relevance:
                    out_of_context_correct += 1
                status = "OUT_OF_CTX_OK" if is_correctly_low_relevance else "OUT_OF_CTX_FAIL"
                score = 1.0 if is_correctly_low_relevance else 0.0
                print(f"        Hors-contexte | Dist moy: {avg_dist:.2f} | {status}")
                results.append({
                    "question": question,
                    "expected_doc": expected_doc,
                    "is_out_of_context": True,
                    "top1": None,
                    "top3": None,
                    "top5": None,
                    "avg_distance": round(avg_dist, 4),
                    "status": status,
                    "score": score,
                })
                continue

            evaluable_count += 1

            # Extraire top-1, top-3, top-5
            top1_found = check_doc_in_results(expected_doc, chunks_5[:1])
            top3_found = check_doc_in_results(expected_doc, chunks_5[:3])
            top5_found = check_doc_in_results(expected_doc, chunks_5[:5])

            if top1_found:
                top1_hits += 1
                top3_hits += 1
                top5_hits += 1
            elif top3_found:
                top3_hits += 1
                top5_hits += 1
            elif top5_found:
                top5_hits += 1

            avg_dist = sum(d for _, d in chunks_5) / max(len(chunks_5), 1)
            top_filenames = [
                (doc.metadata or {}).get("filename", "?")[:30]
                for doc, _ in chunks_5[:3]
            ]

            score = 1.0 if top1_found else (0.6 if top3_found else (0.3 if top5_found else 0.0))
            status = ("TOP1" if top1_found else
                      ("TOP3" if top3_found else
                       ("TOP5" if top5_found else "MISS")))

            print(f"        Top docs: {top_filenames}")
            print(f"        Status: {status} | Dist moy: {avg_dist:.2f} | Score: {score}")

            results.append({
                "question": question,
                "expected_doc": expected_doc,
                "is_out_of_context": False,
                "top1": top1_found,
                "top3": top3_found,
                "top5": top5_found,
                "avg_distance": round(avg_dist, 4),
                "top_retrieved": str(top_filenames),
                "status": status,
                "score": score,
            })

        except Exception as e:
            print(f"        [ERREUR] {e}")
            results.append({
                "question": question,
                "expected_doc": expected_doc,
                "is_out_of_context": is_out_of_context,
                "status": "ERROR",
                "score": 0.0,
                "error": str(e),
            })

    # ── Rapport final ──
    print()
    print("=" * 70)
    print("RESULTATS GLOBAUX")
    print("=" * 70)

    if evaluable_count > 0:
        top1_acc = top1_hits / evaluable_count * 100
        top3_acc = top3_hits / evaluable_count * 100
        top5_acc = top5_hits / evaluable_count * 100
        print(f"  Questions evaluables (avec doc attendu) : {evaluable_count}")
        print(f"  Top-1 Accuracy : {top1_hits}/{evaluable_count} = {top1_acc:.1f}%")
        print(f"  Top-3 Accuracy : {top3_hits}/{evaluable_count} = {top3_acc:.1f}%")
        print(f"  Top-5 Accuracy : {top5_hits}/{evaluable_count} = {top5_acc:.1f}%")
    else:
        print("  Aucune question evaluable (documents non importes dans ChromaDB ?)")

    if out_of_context_count > 0:
        ooc_acc = out_of_context_correct / out_of_context_count * 100
        print(f"\n  Questions hors-contexte : {out_of_context_count}")
        print(f"  Anti-hallucination correct : {out_of_context_correct}/{out_of_context_count} = {ooc_acc:.1f}%")

    # Sauvegarder les résultats
    today = datetime.date.today().isoformat()
    out_file = os.path.join(RESULTS_DIR, f"results_{today}.csv")
    fieldnames = ["question", "expected_doc", "is_out_of_context",
                  "top1", "top3", "top5", "avg_distance", "top_retrieved",
                  "status", "score", "error"]
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)

    print(f"\n[OK] Resultats sauvegardes dans : {out_file}")
    print("=" * 70)


if __name__ == "__main__":
    evaluate()
