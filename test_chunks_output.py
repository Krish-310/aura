#!/usr/bin/env python3
"""
Test script to show ChromaDB chunk retrieval and formatting for /select endpoint
"""
import sys
import os
sys.path.append('/Users/sambhavkhanna/Downloads/Projects/aura/server')

from app.vectordb import search_similar_code, collection_name
from app.prompt import build_messages, build_user_prompt
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_chunk_retrieval_and_formatting():
    """Test ChromaDB chunk retrieval and show formatted output"""
    
    # Test parameters
    owner = "test"
    repo = "aura"
    selected_text = "def ingest_repo(repo_path, repo_name=None, pr_number=1, commit=\"main\"):"
    file_path = "server/app/ingest.py"
    language = "python"
    
    print("🔍 Testing ChromaDB Chunk Retrieval and Formatting")
    print("=" * 60)
    print(f"Owner/Repo: {owner}/{repo}")
    print(f"Selected Code: {selected_text}")
    print(f"File: {file_path}")
    print(f"Language: {language}")
    print("=" * 60)
    
    # Step 1: Generate collection name
    coll_name = collection_name(f"{owner}/{repo}", 1, "main")
    print(f"\n📂 Collection Name: {coll_name}")
    
    # Step 2: Search for similar code snippets
    print(f"\n🔎 Searching ChromaDB for similar code...")
    try:
        search_results = search_similar_code(
            collection_name=coll_name,
            query=selected_text,
            n_results=5
        )
        
        if search_results:
            print(f"✅ Found search results!")
            print(f"📊 Raw search results structure:")
            print(f"  - Keys: {list(search_results.keys())}")
            if 'documents' in search_results:
                print(f"  - Number of documents: {len(search_results['documents'])}")
            if 'metadatas' in search_results:
                print(f"  - Number of metadata entries: {len(search_results['metadatas'])}")
            if 'distances' in search_results:
                print(f"  - Distances: {search_results['distances']}")
            
            # Step 3: Format search results for prompt
            print(f"\n📝 Formatting search results for prompt...")
            related_snippets = []
            
            if 'documents' in search_results:
                for i in range(len(search_results['documents'])):
                    snippet = {
                        'documents': [search_results['documents'][i]],
                        'metadatas': [search_results['metadatas'][i]] if search_results.get('metadatas') and i < len(search_results['metadatas']) else [{}]
                    }
                    related_snippets.append(snippet)
                    
                    # Show each chunk
                    print(f"\n📄 Chunk {i+1}:")
                    print(f"  Content (first 200 chars): {search_results['documents'][i][:200]}...")
                    if search_results.get('metadatas') and i < len(search_results['metadatas']):
                        metadata = search_results['metadatas'][i]
                        print(f"  Metadata: {json.dumps(metadata, indent=4)}")
                    if search_results.get('distances') and i < len(search_results['distances']):
                        print(f"  Distance: {search_results['distances'][i]}")
            
            print(f"\n✅ Formatted {len(related_snippets)} snippets for prompt")
            
            # Step 4: Build the complete prompt
            print(f"\n🏗️  Building complete LLM prompt...")
            messages = build_messages(
                repo=f"{owner}/{repo}",
                file=file_path,
                lang=language,
                selected=selected_text,
                related_snips=related_snippets
            )
            
            print(f"📨 Generated {len(messages)} messages")
            
            # Show the user prompt with context
            for i, message in enumerate(messages):
                print(f"\n📋 Message {i+1} ({message['role']}):")
                print("-" * 40)
                content = message['content']
                if len(content) > 1000:
                    print(f"{content[:500]}")
                    print(f"\n... [TRUNCATED - showing first 500 chars of {len(content)} total] ...")
                    print(f"\n{content[-500:]}")
                else:
                    print(content)
                print("-" * 40)
            
            return True
            
        else:
            print("❌ No search results found")
            return False
            
    except Exception as e:
        print(f"❌ Error during search: {e}")
        return False

def test_prompt_formatting_only():
    """Test prompt formatting with mock data to see the structure"""
    print(f"\n🧪 Testing Prompt Formatting with Mock Data")
    print("=" * 60)
    
    # Mock ChromaDB results
    mock_snippets = [
        {
            'documents': ['def load_code_files(root_dir):\n    """Load code files with better filtering and metadata."""\n    docs = []\n    # Common code file extensions\n    code_extensions = {\n        \'.py\', \'.js\', \'.ts\', \'.tsx\', \'.jsx\', \'.java\', \'.cpp\', \'.c\', \'.h\', \'.hpp\','],
            'metadatas': [{'relative_path': 'server/app/ingest.py', 'file_type': '.py', 'chunk_index': 0}]
        },
        {
            'documents': ['    try:\n        logging.info(f"Starting ingestion of repository: {repo_path}")\n        \n        # Extract repo name from path if not provided\n        if not repo_name:\n            repo_name = Path(repo_path).name.replace(\'_\', \'/\')'],
            'metadatas': [{'relative_path': 'server/app/ingest.py', 'file_type': '.py', 'chunk_index': 1}]
        }
    ]
    
    # Build user prompt
    user_prompt = build_user_prompt(
        repo="test/aura",
        file="server/app/ingest.py", 
        lang="python",
        selected="def ingest_repo(repo_path, repo_name=None, pr_number=1, commit=\"main\"):",
        related_snippets=mock_snippets
    )
    
    print("📝 Generated User Prompt:")
    print("=" * 60)
    print(user_prompt)
    print("=" * 60)

if __name__ == "__main__":
    print("🚀 ChromaDB Chunk Retrieval and Formatting Test\n")
    
    # Test with real ChromaDB data
    success = test_chunk_retrieval_and_formatting()
    
    # Test prompt formatting structure
    test_prompt_formatting_only()
    
    if success:
        print("\n🎉 Test completed successfully!")
    else:
        print("\n⚠️  Test completed with some issues - check ChromaDB connection")
