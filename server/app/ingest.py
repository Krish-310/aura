import os
import logging
import time
from typing import Dict, List, Optional
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import ollama
import chromadb
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global store for ingestion status
ingestion_status: Dict[str, Dict] = {}

def get_supported_file_extensions():
    """Return list of supported code file extensions"""
    return {
        '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.cpp', '.c', '.h', '.hpp',
        '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sh',
        '.sql', '.html', '.css', '.scss', '.less', '.vue', '.svelte', '.md',
        '.txt', '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg'
    }

def should_process_file(file_path: str) -> bool:
    """Check if file should be processed based on extension and size"""
    path = Path(file_path)
    
    # Check extension
    if path.suffix.lower() not in get_supported_file_extensions():
        return False
    
    # Skip files that are too large (>1MB)
    try:
        if path.stat().st_size > 1024 * 1024:
            logger.warning(f"Skipping large file: {file_path} ({path.stat().st_size} bytes)")
            return False
    except OSError:
        return False
    
    # Skip common directories to ignore
    ignore_dirs = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build'}
    if any(ignore_dir in path.parts for ignore_dir in ignore_dirs):
        return False
    
    return True

def load_code_files(root_dir: str, repo_key: str):
    """Load code files with progress tracking"""
    docs = []
    processed_files = 0
    skipped_files = 0
    error_files = 0
    
    logger.info(f"Starting to load files from {root_dir}")
    
    # Count total files first for progress tracking
    total_files = 0
    for root, _, files in os.walk(root_dir):
        for file in files:
            file_path = os.path.join(root, file)
            if should_process_file(file_path):
                total_files += 1
    
    logger.info(f"Found {total_files} files to process")
    
    # Update status
    ingestion_status[repo_key].update({
        'stage': 'loading_files',
        'total_files': total_files,
        'processed_files': 0,
        'progress_percent': 0
    })
    
    for root, _, files in os.walk(root_dir):
        for file in files:
            file_path = os.path.join(root, file)
            
            if not should_process_file(file_path):
                skipped_files += 1
                continue
            
            try:
                loader = TextLoader(file_path, encoding="utf-8")
                file_docs = loader.load()
                docs.extend(file_docs)
                processed_files += 1
                
                # Update progress
                progress = int((processed_files / total_files) * 100)
                ingestion_status[repo_key].update({
                    'processed_files': processed_files,
                    'progress_percent': progress,
                    'current_file': file_path
                })
                
                if processed_files % 10 == 0:  # Log every 10 files
                    logger.info(f"Processed {processed_files}/{total_files} files ({progress}%)")
                    
            except Exception as e:
                error_files += 1
                logger.warning(f"Error loading {file_path}: {e}")
    
    logger.info(f"File loading complete: {processed_files} processed, {skipped_files} skipped, {error_files} errors")
    return docs

def ingest_repo(repo_path: str, owner: str, repo: str) -> Dict:
    """Ingest repository with comprehensive logging and status tracking"""
    repo_key = f"{owner}/{repo}"
    
    # Initialize status tracking
    ingestion_status[repo_key] = {
        'status': 'starting',
        'stage': 'initializing',
        'start_time': time.time(),
        'progress_percent': 0,
        'logs': [],
        'error': None
    }
    
    try:
        logger.info(f"Starting ingestion for repository: {repo_key}")
        
        # Stage 1: Load files
        ingestion_status[repo_key]['stage'] = 'loading_files'
        raw_documents = load_code_files(repo_path, repo_key)
        
        if not raw_documents:
            raise Exception("No documents found to process")
        
        logger.info(f"Loaded {len(raw_documents)} documents")
        
        # Stage 2: Chunk documents
        ingestion_status[repo_key].update({
            'stage': 'chunking',
            'progress_percent': 30
        })
        
        logger.info("Starting document chunking...")
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100
        )
        
        documents = splitter.split_documents(raw_documents)
        documents = [doc.page_content for doc in documents]
        
        logger.info(f"Created {len(documents)} chunks")
        
        # Stage 3: Connect to ChromaDB
        ingestion_status[repo_key].update({
            'stage': 'connecting_chroma',
            'progress_percent': 40
        })
        
        # Connect to ChromaDB - try HTTP client first, fallback to persistent client
        client = None
        try:
            # Try HTTP client first
            client = chromadb.HttpClient(host='localhost', port=8000)
            client.heartbeat()
            logger.info("Successfully connected to ChromaDB via HTTP client")
        except Exception as http_error:
            logger.warning(f"HTTP client failed: {http_error}, trying persistent client")
            try:
                # Fallback to persistent client
                client = chromadb.PersistentClient(path="./chroma")
                logger.info("Successfully connected to ChromaDB via persistent client")
            except Exception as persistent_error:
                logger.error(f"Both HTTP and persistent clients failed. HTTP: {http_error}, Persistent: {persistent_error}")
                raise Exception(f"Could not connect to ChromaDB. HTTP error: {http_error}, Persistent error: {persistent_error}")
        
        # Create collection name
        collection_name = f"{owner}_{repo}".replace("/", "_").replace("-", "_")
        
        # Delete existing collection if it exists
        try:
            client.delete_collection(name=collection_name)
            logger.info(f"Deleted existing collection: {collection_name}")
        except Exception:
            pass  # Collection doesn't exist
        
        collection = client.create_collection(name=collection_name)
        logger.info(f"Created ChromaDB collection: {collection_name}")
        
        # Stage 4: Generate embeddings
        ingestion_status[repo_key].update({
            'stage': 'generating_embeddings',
            'progress_percent': 50,
            'total_chunks': len(documents),
            'processed_chunks': 0
        })
        
        ollama_host = os.getenv('OLLAMA_HOST', 'localhost:11434')
        ollama_client = ollama.Client(host=f'http://{ollama_host}')
        
        logger.info(f"Starting embedding generation for {len(documents)} chunks...")
        
        # Process documents in batches
        batch_size = 10
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            
            for j, doc in enumerate(batch):
                doc_id = i + j
                try:
                    response = ollama_client.embed(model="mxbai-embed-large", input=doc)
                    embeddings = response["embeddings"]
                    
                    collection.add(
                        ids=[str(doc_id)],
                        embeddings=embeddings,
                        documents=[doc]
                    )
                    
                    # Update progress
                    processed = doc_id + 1
                    progress = 50 + int((processed / len(documents)) * 45)  # 50-95%
                    ingestion_status[repo_key].update({
                        'processed_chunks': processed,
                        'progress_percent': progress
                    })
                    
                    if processed % 50 == 0:
                        logger.info(f"Embedded {processed}/{len(documents)} chunks ({progress}%)")
                        
                except Exception as e:
                    logger.error(f"Error embedding chunk {doc_id}: {e}")
                    continue
        
        # Stage 5: Complete
        end_time = time.time()
        duration = end_time - ingestion_status[repo_key]['start_time']
        
        ingestion_status[repo_key].update({
            'status': 'completed',
            'stage': 'completed',
            'progress_percent': 100,
            'end_time': end_time,
            'duration': duration,
            'collection_name': collection_name,
            'total_documents': len(raw_documents),
            'total_chunks': len(documents)
        })
        
        logger.info(f"Ingestion completed for {repo_key} in {duration:.2f} seconds")
        logger.info(f"Collection: {collection_name}, Documents: {len(raw_documents)}, Chunks: {len(documents)}")
        
        return {
            'success': True,
            'collection_name': collection_name,
            'total_documents': len(raw_documents),
            'total_chunks': len(documents),
            'duration': duration
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Ingestion failed for {repo_key}: {error_msg}")
        
        ingestion_status[repo_key].update({
            'status': 'failed',
            'stage': 'error',
            'error': error_msg,
            'end_time': time.time()
        })
        
        return {
            'success': False,
            'error': error_msg
        }

def get_ingestion_status(owner: str, repo: str) -> Optional[Dict]:
    """Get current ingestion status for a repository"""
    repo_key = f"{owner}/{repo}"
    return ingestion_status.get(repo_key)