import os
import math
import logging
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

# Configuration for Chroma — override with env CHROMA_PERSIST_DIR if you change embedding model
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")

# sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 :
#   - 457 MB (deja telecharge, chargement ~15s)
#   - 50+ langues dont FR et EN, dim 384
# Pour changer de modele : supprimer chroma_db et reimporter les docs.
EMBEDDING_MODEL_NAME = os.getenv(
    "RAG_EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)

# normalize pour une similarité cosinus correcte
EMBEDDING_ENCODE_KWARGS = {"normalize_embeddings": True}

SUPPORTED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xlsx", ".xls", ".pptx", ".ppt"}

# Lazy singletons (avoid loading heavy models at import time during tooling)
_embeddings = None
_reranker = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        logger.info("Loading embedding model: %s", EMBEDDING_MODEL_NAME)
        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL_NAME,
            model_kwargs={"trust_remote_code": True},
            encode_kwargs=EMBEDDING_ENCODE_KWARGS,
        )
    return _embeddings


def get_reranker():
    global _reranker
    if _reranker is None:
        try:
            from sentence_transformers import CrossEncoder

            logger.info("Loading cross-encoder reranker")
            _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        except Exception as e:
            logger.warning("Cross-encoder not available: %s", e)
            _reranker = False
    return _reranker


def get_vector_store():
    return Chroma(persist_directory=CHROMA_PERSIST_DIR, embedding_function=get_embeddings())


def _ce_score_to_distance(score: float) -> float:
    """Map cross-encoder logit to a pseudo-distance (lower = better) for downstream exp(-d)."""
    rel = 1.0 / (1.0 + math.exp(-float(score)))
    return 3.0 * (1.0 - rel)


def _load_excel(file_path: str) -> list[Document]:
    """Load an Excel workbook — each sheet becomes a document."""
    try:
        import openpyxl
    except ImportError:
        raise RuntimeError("openpyxl not installed. Run: pip install openpyxl")
    wb = openpyxl.load_workbook(file_path, data_only=True)
    docs: list[Document] = []
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows: list[str] = []
        for row in ws.iter_rows(values_only=True):
            cells = [str(c) if c is not None else "" for c in row]
            line = "\t".join(cells).strip()
            if line:
                rows.append(line)
        if rows:
            docs.append(Document(
                page_content="\n".join(rows),
                metadata={"sheet": sheet_name},
            ))
    return docs


def _load_pptx(file_path: str) -> list[Document]:
    """Load a PowerPoint presentation — each slide becomes a document."""
    try:
        from pptx import Presentation
    except ImportError:
        raise RuntimeError("python-pptx not installed. Run: pip install python-pptx")
    prs = Presentation(file_path)
    docs: list[Document] = []
    for i, slide in enumerate(prs.slides, start=1):
        texts: list[str] = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                texts.append(shape.text.strip())
        if texts:
            docs.append(Document(
                page_content="\n".join(texts),
                metadata={"slide": i},
            ))
    return docs


def ingest_document(file_path: str, doc_id: int, metadata: dict):
    """
    Extracts text from a document, chunks it, and adds it to the vector store.
    Supports: PDF, DOCX, DOC, XLSX, XLS, PPTX, PPT.
    """
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
        documents = loader.load()
    elif ext in [".docx", ".doc"]:
        loader = Docx2txtLoader(file_path)
        documents = loader.load()
    elif ext in [".xlsx", ".xls"]:
        documents = _load_excel(file_path)
    elif ext in [".pptx", ".ppt"]:
        documents = _load_pptx(file_path)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")


    for doc in documents:
        doc.metadata.update(metadata)
        doc.metadata["doc_id"] = str(doc_id)

    # QMS-friendly splitting: headings, paragraphs, then sentences.
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=220,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = text_splitter.split_documents(documents)

    if not chunks:
        return

    vector_store = get_vector_store()
    vector_store.add_documents(chunks)


def search_similar_chunks(
    query: str,
    k: int = 4,
    metadata_filter: dict | None = None,
    fetch_multiplier: int = 6,
):
    """
    Vector search then cross-encoder rerank for better precision.
    Returns (Document, distance) with lower = better (compatible with main.py thresholds).
    """
    vector_store = get_vector_store()
    n_fetch = min(max(k * fetch_multiplier, k + 8), 48)
    hits = vector_store.similarity_search_with_score(query, k=n_fetch, filter=metadata_filter)

    if not hits:
        return []

    reranker = get_reranker()
    if reranker is False:
        return hits[:k]

    try:
        max_chars = 512
        pairs = []
        for doc, _dist in hits:
            text = (doc.page_content or "")[:max_chars]
            pairs.append([query, text])
        scores = reranker.predict(pairs, show_progress_bar=False)
        rescored = []
        for (doc, orig_dist), score in zip(hits, scores):
            pseudo_dist = _ce_score_to_distance(float(score))
            # Blend: keep weak vector signal so irrelevant CE peaks don't dominate
            blend = 0.75 * pseudo_dist + 0.25 * float(orig_dist)
            rescored.append((doc, blend))
        rescored.sort(key=lambda x: x[1])
        return rescored[:k]
    except Exception as e:
        logger.warning("Reranking failed, using vector order: %s", e)
        return hits[:k]


def remove_document_from_index(doc_id: int):
    vector_store = get_vector_store()
    try:
        vector_store._collection.delete(where={"doc_id": str(doc_id)})
    except Exception as e:
        print(f"Error removing document from index: {e}")
