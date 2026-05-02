
import time
print("Loading embeddings...")
start = time.time()
from langchain_huggingface import HuggingFaceEmbeddings
model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
embeddings = HuggingFaceEmbeddings(
    model_name=model_name,
    model_kwargs={"trust_remote_code": True},
    encode_kwargs={"normalize_embeddings": True},
)
print(f"Embeddings loaded in {time.time() - start:.2f} seconds")
