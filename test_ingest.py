#!/usr/bin/env python3
"""
Test script to verify ChromaDB ingest functionality
"""
import sys
import os
sys.path.append('/Users/sambhavkhanna/Downloads/Projects/aura/server')

from app.ingest import ingest_repo
from app.vectordb import get_or_create_collection, collection_name
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_ingest():
    """Test the ingest functionality with the current project"""
    repo_path = "/Users/sambhavkhanna/Downloads/Projects/aura"
    repo_name = "test/aura"
    pr_number = 1
    commit = "main"
    
    print(f"Testing ingest of repository: {repo_path}")
    
    # Test ingest
    success = ingest_repo(
        repo_path=repo_path,
        repo_name=repo_name,
        pr_number=pr_number,
        commit=commit
    )
    
    if success:
        print("✅ Ingest completed successfully!")
        
        # Test collection retrieval
        coll_name = collection_name(repo_name, pr_number, commit)
        collection = get_or_create_collection(coll_name)
        
        # Check collection contents
        count = collection.count()
        print(f"📊 Collection '{coll_name}' contains {count} documents")
        
        if count > 0:
            # Get a sample of documents
            results = collection.peek(limit=3)
            print(f"📄 Sample documents:")
            for i, doc in enumerate(results['documents'][:3]):
                print(f"  {i+1}. {doc[:100]}...")
                if results['metadatas'] and i < len(results['metadatas']):
                    metadata = results['metadatas'][i]
                    print(f"     Metadata: {metadata}")
        
        return True
    else:
        print("❌ Ingest failed!")
        return False

if __name__ == "__main__":
    test_ingest()
