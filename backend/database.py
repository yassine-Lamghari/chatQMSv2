from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./qms_chatbot.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="user") # admin or user

class LLMConfig(Base):
    __tablename__ = "llm_configs"
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, unique=True) # groq, gemini, deepseek, ollama
    api_key = Column(String, nullable=True)
    base_url = Column(String, nullable=True)

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
    criticality = Column(String) # Low, Med, High
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


def migrate_sqlite_schema():
    """Lightweight migrations for SQLite (add columns if missing)."""
    insp = inspect(engine)
    if not insp.has_table("document_metadata"):
        return
    cols = {c["name"] for c in insp.get_columns("document_metadata")}
    with engine.begin() as conn:
        if "site" not in cols:
            conn.execute(text("ALTER TABLE document_metadata ADD COLUMN site VARCHAR DEFAULT 'default'"))


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
