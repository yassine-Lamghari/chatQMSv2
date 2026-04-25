"""QMS helpers: audit packs, PFMEA skeleton, document verification rules."""

from __future__ import annotations

ISO_9001_CORE = [
    "Context of the organization & interested parties (4.1–4.2)",
    "Leadership & policy (5.1–5.2)",
    "Planning of the QMS & risks (6.1)",
    "Support: resources, competence, awareness, documented information (7.1–7.5)",
    "Operation: control of processes, design/development if applicable (8.1–8.5)",
    "Performance evaluation: monitoring, internal audit, management review (9.1–9.3)",
    "Improvement: nonconformity & corrective action (10.2)",
]

IATF_16949_EXTRA = [
    "Customer-specific requirements & CSR alignment",
    "Product safety & statutory/regulatory conformity",
    "Manufacturing feasibility & control plans (CP)",
    "Embedded software / product with embedded software if applicable",
    "Second-party audit management & supplier development",
    "Problem solving (8D / similar) & lessons learned",
]


def audit_questions_for_standard(standard: str, process: str) -> list[str]:
    std = (standard or "").strip().upper().replace(" ", "")
    base = [f"[{process}] {item}" for item in ISO_9001_CORE]
    if "16949" in std or "IATF" in std:
        base.extend([f"[{process}] {item}" for item in IATF_16949_EXTRA])
    return base


def audit_sampling_plan(process: str, depth: str = "normal") -> dict:
    """Simple deterministic sampling guidance (MVP)."""
    depth = (depth or "normal").lower()
    n_files = 5 if depth == "light" else 12 if depth == "normal" else 20
    n_records = 8 if depth == "light" else 15 if depth == "normal" else 25
    return {
        "process": process,
        "depth": depth,
        "document_sample_size": n_files,
        "record_sample_size": n_records,
        "rationale": "Stratified sample across procedure, records, and CAPA trail for the targeted process.",
    }


def pfmea_skeleton_rows(process: str, product: str, known_defects: str, rag_excerpts: list[str]) -> list[dict]:
    defects = [d.strip() for d in known_defects.replace(";", ",").split(",") if d.strip()]
    if not defects:
        defects = ["Unspecified defect — refine with team"]
    rows = []
    for i, d in enumerate(defects[:12], start=1):
        ctx = rag_excerpts[0][:400] if rag_excerpts else ""
        rows.append(
            {
                "line": i,
                "process_step": process,
                "product": product,
                "failure_mode": d,
                "effects": "To be completed from shop-floor data",
                "severity": "",
                "occurrence": "",
                "detection": "",
                "rpn": "",
                "recommended_actions": "Align with control plan / work instructions",
                "rag_context_excerpt": ctx,
            }
        )
    return rows


def verify_pfmea_row(row: dict) -> tuple[list[str], list[str]]:
    """Returns (missing_fields, warnings)."""
    missing = []
    warnings = []
    required = ["failure_mode", "effects", "severity", "occurrence", "detection"]
    for k in required:
        v = row.get(k)
        if v is None or (isinstance(v, str) and not str(v).strip()):
            missing.append(k)
    try:
        s, o, d = int(row.get("severity") or 0), int(row.get("occurrence") or 0), int(row.get("detection") or 0)
        if s and o and d and s * o * d > 200:
            warnings.append("RPN aggregate is high — validate detection controls and occurrence data.")
    except ValueError:
        warnings.append("Severity / occurrence / detection must be numeric when provided.")
    return missing, warnings


DEFAULT_TEMPLATES = [
    {
        "key": "pfmea_blank",
        "name": "PFMEA — structure vierge",
        "doc_type": "PFMEA",
        "language": "fr",
        "version": "1.0",
        "body": "Colonnes: Process step | Failure mode | Effects | S | O | D | RPN | Actions",
    },
    {
        "key": "audit_iso9001",
        "name": "Plan audit ISO 9001 (squelette)",
        "doc_type": "Audit",
        "language": "fr",
        "version": "1.0",
        "body": "Jour 1: Ouverture, revue direction, processus réalisation.\nJour 2: Support, amélioration, clôture.",
    },
]
