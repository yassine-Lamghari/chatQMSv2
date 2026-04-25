"""
RAG answer synthesis via the configured active LLM (Groq, Gemini, DeepSeek, Ollama).
Returns structured text; callers keep vector excerpts in detail_sections.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)

_MAX_SNIPPET_CHARS = 3600


def _strip_json_fence(raw: str) -> str:
    t = (raw or "").strip()
    if t.startswith("```"):
        t = re.sub(r"^```\w*\s*", "", t, count=1)
        t = re.sub(r"\s*```\s*$", "", t, count=1)
    return t.strip()


def parse_llm_json(raw: str) -> dict[str, Any] | None:
    t = _strip_json_fence(raw)
    try:
        out = json.loads(t)
        return out if isinstance(out, dict) else None
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if m:
            try:
                out = json.loads(m.group(0))
                return out if isinstance(out, dict) else None
            except json.JSONDecodeError:
                return None
    return None


def _deepseek_chat(
    api_key: str,
    base_url: str | None,
    system_prompt: str,
    user_prompt: str,
    timeout_s: float = 120.0,
) -> str:
    import urllib.error
    import urllib.request

    root = (base_url or "").strip().rstrip("/")
    if not root:
        root = "https://api.deepseek.com"
    if root.endswith("/chat/completions"):
        url = root
    elif root.endswith("/v1"):
        url = root + "/chat/completions"
    else:
        url = root + "/v1/chat/completions"
    model = os.getenv("DEEPSEEK_CHAT_MODEL", "deepseek-chat")
    body = json.dumps(
        {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.15,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        logger.warning("DeepSeek HTTP error: %s %s", e.code, err_body[:500])
        raise
    return data["choices"][0]["message"]["content"]


def invoke_llm(
    provider: str,
    *,
    api_key: str | None,
    base_url: str | None,
    ollama_model: str | None,
    system_prompt: str,
    user_prompt: str,
) -> str:
    p = (provider or "").strip().lower()
    if p == "groq":
        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_groq import ChatGroq

        if not (api_key or "").strip():
            raise ValueError("Groq API key missing")
        model = os.getenv("GROQ_CHAT_MODEL", "llama-3.1-8b-instant")
        llm = ChatGroq(api_key=api_key.strip(), model=model, temperature=0.15)
        msg = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        return str(msg.content)

    if p == "gemini":
        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_google_genai import ChatGoogleGenerativeAI

        if not (api_key or "").strip():
            raise ValueError("Gemini API key missing")
        model = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.0-flash")
        llm = ChatGoogleGenerativeAI(google_api_key=api_key.strip(), model=model, temperature=0.15)
        msg = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        return str(msg.content)

    if p == "deepseek":
        if not (api_key or "").strip():
            raise ValueError("DeepSeek API key missing")
        return _deepseek_chat(api_key.strip(), base_url, system_prompt, user_prompt)

    if p == "ollama":
        from langchain_community.chat_models import ChatOllama
        from langchain_core.messages import HumanMessage, SystemMessage

        host = (base_url or os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")).rstrip("/")
        model = (ollama_model or os.getenv("OLLAMA_MODEL", "llama3.2")).strip()
        llm = ChatOllama(model=model, base_url=host, temperature=0.15)
        msg = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        return str(msg.content)

    raise ValueError(f"Unsupported provider: {provider}")


def _normalize_bullets(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        return lines[:12]
    if isinstance(raw, list):
        out: list[str] = []
        for x in raw:
            if isinstance(x, str) and x.strip():
                out.append(x.strip())
        return out[:12]
    return []


def synthesize_from_context(
    *,
    provider: str,
    api_key: str | None,
    base_url: str | None,
    ollama_model: str | None,
    user_query: str,
    numbered_context: str,
    respond_english: bool,
) -> dict[str, Any] | None:
    """
    Returns dict with keys: summary, summary_bullets, details, answer_in_context (bool).
    On total failure returns None (caller uses excerpt fallback).
    """
    if respond_english:
        system = (
            "You are a QMS documentation assistant. You ONLY use the CONTEXT passages below "
            "(indexed [1], [2], …). Do not invent procedures, numbers, or requirements not present in CONTEXT. "
            "If CONTEXT does not answer the question, set answer_in_context to false and say so clearly in summary.\n"
            "Reply with a single JSON object, no markdown fences, keys exactly:\n"
            '{"summary": string, "summary_bullets": array of strings, "details": string, "answer_in_context": boolean}\n'
            "summary: 2–4 sentences. summary_bullets: 3–8 concise points (no leading dashes required). "
            "details: structured synthesis referencing sources like [1], [2]. "
            "Write everything in English."
        )
        user = f"User question:\n{user_query}\n\nCONTEXT:\n{numbered_context}"
    else:
        system = (
            "Tu es un assistant documentation QMS. Tu utilises UNIQUEMENT les passages CONTEXT ci-dessous "
            "(numérotés [1], [2], …). N’invente pas d’exigences, numéros de procédure ou données absentes du CONTEXT. "
            "Si le CONTEXT ne permet pas de répondre, mets answer_in_context à false et explique-le clairement dans summary.\n"
            "Réponds par un seul objet JSON, sans balises markdown, clés exactement :\n"
            '{"summary": string, "summary_bullets": array of strings, "details": string, "answer_in_context": boolean}\n'
            "summary : 2–4 phrases. summary_bullets : 3–8 points courts. "
            "details : synthèse structurée en citant les sources [1], [2], etc. "
            "Rédige tout en français."
        )
        user = f"Question utilisateur :\n{user_query}\n\nCONTEXT :\n{numbered_context}"

    raw = invoke_llm(
        provider,
        api_key=api_key,
        base_url=base_url,
        ollama_model=ollama_model,
        system_prompt=system,
        user_prompt=user,
    )
    parsed = parse_llm_json(raw)
    if not parsed:
        logger.warning("LLM RAG: could not parse JSON from model output (first 200 chars): %s", (raw or "")[:200])
        return None

    summary = parsed.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        return None
    bullets = _normalize_bullets(parsed.get("summary_bullets"))
    details = parsed.get("details")
    if not isinstance(details, str):
        details = ""
    aic = parsed.get("answer_in_context")
    answer_in_context = True if aic is None else bool(aic)

    return {
        "summary": summary.strip(),
        "summary_bullets": bullets,
        "details": details.strip(),
        "answer_in_context": answer_in_context,
    }


def build_numbered_context(section_refs: list[str], snippets: list[str], max_chunks: int) -> str:
    parts: list[str] = []
    for i, (ref, snip) in enumerate(zip(section_refs, snippets), start=1):
        if i > max_chunks:
            break
        body = (snip or "").strip()[:_MAX_SNIPPET_CHARS]
        parts.append(f"[{i}] {ref}\n{body}")
    return "\n\n---\n\n".join(parts)
