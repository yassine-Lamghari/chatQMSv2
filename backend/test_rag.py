
import time
from rag import get_vector_store
print("Loading vector store...")
start = time.time()
try:
    vs = get_vector_store()
    print(f"Vector store loaded in {time.time() - start:.2f} seconds")
except Exception as e:
    print(f"Failed to load vector store: {e}")
