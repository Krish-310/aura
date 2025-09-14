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

def load_code_files(root_dir: str, repo_key: str = None):
    """Load code files with progress tracking and metadata"""
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
    
    # Update status if repo_key provided
    if repo_key and repo_key in ingestion_status:
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
                
                # Add relative path metadata
                for doc in file_docs:
                    doc.metadata['relative_path'] = str(Path(file_path).relative_to(root_dir))
                    doc.metadata['file_type'] = Path(file_path).suffix
                
                docs.extend(file_docs)
                processed_files += 1
                
                # Update progress if repo_key provided
                if repo_key and repo_key in ingestion_status:
                    progress = int((processed_files / total_files) * 100)
                    ingestion_status[repo_key].update({
                        'processed_files': processed_files,
                        'progress_percent': progress,
                        'current_file': file_path
                    })
                
                if processed_files % 10 == 0:  # Log every 10 files
                    logger.info(f"Processed {processed_files}/{total_files} files ({progress if repo_key else 0}%)")
                    
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
            chunk_size=1500,  # Larger chunks for better code context
            chunk_overlap=200,  # More overlap to preserve context
            separators=["\n\n", "\n", " ", ""]  # Code-friendly separators
        )
        
        documents = splitter.split_documents(raw_documents)
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
            chroma_host = os.getenv('CHROMA_HOST', 'localhost:8000')
            host, port = chroma_host.split(':')
            client = chromadb.HttpClient(host=host, port=int(port))
            client.heartbeat()
            logger.info(f"Successfully connected to ChromaDB via HTTP client at {host}:{port}")
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
        successful_adds = 0
        
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            batch_ids = []
            batch_embeddings = []
            batch_documents = []
            batch_metadatas = []
            
            for j, doc in enumerate(batch):
                doc_id = i + j
                try:
                    response = ollama_client.embed(model="mxbai-embed-large", input=doc.page_content)
                    
                    # Handle different response formats
                    if "embeddings" in response:
                        embedding = response["embeddings"]
                        if isinstance(embedding, list) and len(embedding) > 0:
                            # If embeddings is a list of embeddings, take the first one
                            embedding = embedding[0] if isinstance(embedding[0], list) else embedding
                    elif "embedding" in response:
                        embedding = response["embedding"]
                    else:
                        logger.error(f"Unexpected embedding response format: {response.keys()}")
                        continue
                    
                    batch_ids.append(str(doc_id))
                    batch_embeddings.append(embedding)
                    batch_documents.append(doc.page_content)
                    
                    # Prepare metadata
                    metadata = dict(doc.metadata)
                    metadata['chunk_index'] = doc_id
                    metadata['repo_path'] = repo_path
                    batch_metadatas.append(metadata)
                    
                except Exception as e:
                    logger.error(f"Error embedding chunk {doc_id}: {e}")
                    continue
            
            # Add batch to collection
            if batch_ids:
                try:
                    collection.add(
                        ids=batch_ids,
                        embeddings=batch_embeddings,
                        documents=batch_documents,
                        metadatas=batch_metadatas
                    )
                    successful_adds += len(batch_ids)
                    
                    # Update progress
                    progress = 50 + int((successful_adds / len(documents)) * 45)  # 50-95%
                    ingestion_status[repo_key].update({
                        'processed_chunks': successful_adds,
                        'progress_percent': progress
                    })
                    
                    if successful_adds % 50 == 0:
                        logger.info(f"Embedded {successful_adds}/{len(documents)} chunks ({progress}%)")
                        
                except Exception as e:
                    logger.error(f"Error adding batch to ChromaDB: {e}")
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
            'total_chunks': len(documents),
            'successful_chunks': successful_adds
        })
        
        logger.info(f"Ingestion completed for {repo_key} in {duration:.2f} seconds")
        logger.info(f"Collection: {collection_name}, Documents: {len(raw_documents)}, Chunks: {successful_adds}/{len(documents)}")
        
        return {
            'success': True,
            'collection_name': collection_name,
            'total_documents': len(raw_documents),
            'total_chunks': len(documents),
            'successful_chunks': successful_adds,
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
