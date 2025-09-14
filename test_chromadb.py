#!/usr/bin/env python3
"""
Simple ChromaDB connection test
"""
import chromadb
import logging

logging.basicConfig(level=logging.INFO)

def test_chromadb_connection():
    """Test direct ChromaDB connection"""
    try:
        print("Testing ChromaDB connection...")
        
        # Try different client configurations
        clients_to_try = [
            chromadb.HttpClient(host="localhost", port=8000),
            chromadb.HttpClient(host="127.0.0.1", port=8000),
            chromadb.Client(),  # Default client
        ]
        
        for i, client in enumerate(clients_to_try):
            try:
                print(f"\nTrying client configuration {i+1}...")
                
                # Test basic connection
                heartbeat = client.heartbeat()
                print(f"✅ Heartbeat successful: {heartbeat}")
                
                # List collections
                collections = client.list_collections()
                print(f"📋 Existing collections: {[c.name for c in collections]}")
                
                # Try creating a test collection
                test_collection_name = "test_collection"
                try:
                    test_collection = client.create_collection(name=test_collection_name)
                    print(f"✅ Created test collection: {test_collection_name}")
                    
                    # Test adding a document
                    test_collection.add(
                        documents=["This is a test document"],
                        ids=["test_id_1"]
                    )
                    print("✅ Added test document")
                    
                    # Test querying
                    count = test_collection.count()
                    print(f"📊 Collection count: {count}")
                    
                    # Clean up
                    client.delete_collection(name=test_collection_name)
                    print("🧹 Cleaned up test collection")
                    
                    return True
                    
                except Exception as e:
                    print(f"❌ Collection operations failed: {e}")
                    continue
                    
            except Exception as e:
                print(f"❌ Client {i+1} failed: {e}")
                continue
        
        return False
        
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_chromadb_connection()
    if success:
        print("\n🎉 ChromaDB connection test passed!")
    else:
        print("\n💥 ChromaDB connection test failed!")
