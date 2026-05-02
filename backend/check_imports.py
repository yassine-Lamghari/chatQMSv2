
import sys
print("Starting import check...")
try:
    from fastapi import FastAPI
    print("FastAPI imported")
    from sqlalchemy.orm import Session
    print("SQLAlchemy imported")
    import bcrypt
    print("Bcrypt imported")
    import langchain_community
    print("Langchain Community imported")
    import langchain_huggingface
    print("Langchain HuggingFace imported")
    import chromadb
    print("ChromaDB imported")
    print("All basic imports successful")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)
