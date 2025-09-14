import os
import chromadb
import logging

def collection_name(repo: str, pr_number: int, commit: str) -> str:
    """Generate a collection name for ChromaDB based on repo, PR, and commit."""
    return f"{repo}_{pr_number}_{commit}".replace("/", "_").replace("-", "_")

def get_or_create_collection(name: str):
    """Get or create a ChromaDB collection."""
    client = None
    try:
        # Try HTTP client first
        chroma_host = os.getenv('CHROMA_HOST', 'localhost:8000')
        host, port = chroma_host.split(':')
        client = chromadb.HttpClient(host=host, port=int(port))
        client.heartbeat()
        logging.info(f"Connected to ChromaDB at {host}:{port}")
    except Exception as http_error:
        logging.warning(f"HTTP client failed: {http_error}, trying persistent client")
        try:
            # Fallback to persistent client
            client = chromadb.PersistentClient(path="./chroma")
            logging.info("Connected to ChromaDB via persistent client")
        except Exception as persistent_error:
            logging.error(f"Both HTTP and persistent clients failed. HTTP: {http_error}, Persistent: {persistent_error}")
            raise Exception(f"Could not connect to ChromaDB. HTTP error: {http_error}, Persistent error: {persistent_error}")
    
    try:
        # Try to get existing collection
        collection = client.get_collection(name=name)
        logging.info(f"Retrieved existing collection: {name}")
        return collection
    except Exception as e:
        logging.info(f"Collection {name} not found, creating new one: {e}")
        try:
            # Create new collection if it doesn't exist
            collection = client.create_collection(name=name)
            logging.info(f"Created new collection: {name}")
            return collection
        except Exception as create_error:
            logging.error(f"Failed to create collection {name}: {create_error}")
            raise

def search_similar_code(collection_name: str, query: str, n_results: int = 5):
    """Search for similar code snippets in the collection."""
    client = None
    try:
        # Try HTTP client first
        chroma_host = os.getenv('CHROMA_HOST', 'localhost:8000')
        host, port = chroma_host.split(':')
        client = chromadb.HttpClient(host=host, port=int(port))
        client.heartbeat()
        logging.info(f"Connected to ChromaDB at {host}:{port}")
    except Exception as http_error:
        logging.warning(f"HTTP client failed: {http_error}, trying persistent client")
        try:
            # Fallback to persistent client
            client = chromadb.PersistentClient(path="./chroma")
            logging.info("Connected to ChromaDB via persistent client")
        except Exception as persistent_error:
            logging.error(f"Both HTTP and persistent clients failed. HTTP: {http_error}, Persistent: {persistent_error}")
            raise Exception(f"Could not connect to ChromaDB. HTTP error: {http_error}, Persistent error: {persistent_error}")
    
    try:
        collection = client.get_collection(name=collection_name)
        
        # Use Ollama for embedding the query
        import ollama
        ollama_host = os.getenv('OLLAMA_HOST', 'localhost:11434')
        ollama_client = ollama.Client(host=f'http://{ollama_host}')
        
        # Generate embedding for the query
        response = ollama_client.embed(model="mxbai-embed-large", input=query)
        query_embedding = response["embeddings"]
        
        # Search for similar documents
        results = collection.query(
            query_embeddings=query_embedding,
            n_results=n_results
        )
        
        return results
    except Exception as e:
        print(f"Error searching collection {collection_name}: {e}")
        return None
