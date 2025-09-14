import os
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import ollama
import chromadb

def load_code_files(root_dir):
    docs = []
    for root, _, files in os.walk(root_dir):
        for file in files:
            path = os.path.join(root, file)
            loader = TextLoader(path, encoding="utf-8")
            try:
                docs.extend(loader.load())
            except Exception as e:
                print(f"Error loading {path}: {e}")
    return docs

# Load the entire repo
def ingest_repo(repo_path):
    raw_documents = load_code_files(f"{repo_path}")

    # Chunk the code
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,  # tune for your use case
        chunk_overlap=100
    )

    documents = splitter.split_documents(raw_documents)
    documents = [doc.page_content for doc in documents]
    
    # Connect to ChromaDB
    chroma_host = os.getenv('CHROMA_HOST', 'localhost:8000')
    host, port = chroma_host.split(':')
    client = chromadb.HttpClient(host=host, port=int(port))

    collection = client.create_collection(name=f"{repo_path}")

    # Configure Ollama client to use Docker service
    ollama_host = os.getenv('OLLAMA_HOST', 'localhost:11434')
    ollama_client = ollama.Client(host=f'http://{ollama_host}')

    # store each document in a vector embedding database
    for i, d in enumerate(documents):
        response = ollama_client.embed(model="mxbai-embed-large", input=d)
        embeddings = response["embeddings"]
        collection.add(
            ids=[str(i)],
            embeddings=embeddings,
            documents=[d]
        )