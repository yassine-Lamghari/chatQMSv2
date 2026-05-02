from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, inspect, text
# Fix #18 — remplace declarative_base() déprécié depuis SQLAlchemy 2.0
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./qms_chatbot.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Fix #18 : nouvelle syntaxe SQLAlchemy 2.0
class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="user")  # admin or user
    site = Column(String, default="default")  # multi-tenant site

class LLMConfig(Base):
    __tablename__ = "llm_configs"
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, unique=True)  # groq, gemini, deepseek, ollama
    api_key = Column(String, nullable=True)   # Fix #4 : stocké chiffré via crypto_utils
    base_url = Column(String, nullable=True)
    model_name = Column(String, nullable=True)  # e.g. llama3.2 for ollama

class AppSetting(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String, nullable=True)

class DocumentMetadata(Base):
    __tablename__ = "document_metadata"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    doc_type = Column(String)
    criticality = Column(String)  # Low, Med, High
    version = Column(String)
    owner = Column(String)
    language = Column(String)
    site = Column(String, default="default")
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

class DocumentTemplate(Base):
    __tablename__ = "document_templates"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    name = Column(String)
    doc_type = Column(String)
    language = Column(String)
    version = Column(String)
    body = Column(Text)

class ActivityLog(Base):
    """Audit trail: one row per user query."""
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, default="anonymous")
    action = Column(String, nullable=False)
    query = Column(Text, nullable=True)
    document_ids = Column(String, nullable=True)
    confidence = Column(String, nullable=True)
    confidence_score = Column(String, nullable=True)  # numeric score
    language_mode = Column(String, nullable=True)
    response_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ChatSession(Base):
    """Persistent chat session stored in DB per user."""
    __tablename__ = "chat_sessions"
    id = Column(String, primary_key=True, index=True)  # UUID
    username = Column(String, nullable=False, index=True)
    title = Column(String, default="New chat")
    messages_json = Column(Text, default="[]")  # JSON array
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# Fix #11 — Pagination : modèle AuditChecklistResult pour sauvegarder les audits
class AuditResult(Base):
    """Résultats d'audit sauvegardés pour la checklist interactive (#13)."""
    __tablename__ = "audit_results"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    standard = Column(String)
    process = Column(String)
    checklist_json = Column(Text, default="[]")  # [{question, checked, note}]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


def migrate_sqlite_schema():
    """Lightweight migrations for SQLite (add columns if missing)."""
    insp = inspect(engine)
    with engine.begin() as conn:
        # document_metadata
        if insp.has_table("document_metadata"):
            cols = {c["name"] for c in insp.get_columns("document_metadata")}
            if "site" not in cols:
                conn.execute(text("ALTER TABLE document_metadata ADD COLUMN site VARCHAR DEFAULT 'default'"))
        # users
        if insp.has_table("users"):
            cols = {c["name"] for c in insp.get_columns("users")}
            if "site" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN site VARCHAR DEFAULT 'default'"))
        # llm_configs
        if insp.has_table("llm_configs"):
            cols = {c["name"] for c in insp.get_columns("llm_configs")}
            if "model_name" not in cols:
                conn.execute(text("ALTER TABLE llm_configs ADD COLUMN model_name VARCHAR"))
        # activity_logs
        if insp.has_table("activity_logs"):
            cols = {c["name"] for c in insp.get_columns("activity_logs")}
            if "confidence_score" not in cols:
                conn.execute(text("ALTER TABLE activity_logs ADD COLUMN confidence_score VARCHAR"))


def seed_default_templates(db):
    import services_qms as _sq

    for t in _sq.DEFAULT_TEMPLATES:
        exists = db.query(DocumentTemplate).filter(DocumentTemplate.key == t["key"]).first()
        if exists:
            continue
        db.add(
            DocumentTemplate(
                key=t["key"],
                name=t["name"],
                doc_type=t["doc_type"],
                language=t["language"],
                version=t["version"],
                body=t["body"],
            )
        )
    db.commit()


def init_db():
    Base.metadata.create_all(bind=engine)
    migrate_sqlite_schema()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
