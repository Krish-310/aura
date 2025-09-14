#!/usr/bin/env python3
"""
Test script for the enhanced /select endpoint with ChromaDB context
"""
import requests
import json
import sys

def test_select_endpoint():
    """Test the /select endpoint with sample code"""
    
    # Test data - using code from our own project
    test_request = {
        "owner": "test",
        "repo": "aura", 
        "sha": "main",
        "file": "server/app/ingest.py",
        "selected_text": "def ingest_repo(repo_path, repo_name=None, pr_number=1, commit=\"main\"):",
        "language": "python"
    }
    
    print("🧪 Testing /select endpoint with ChromaDB context...")
    print(f"Selected code: {test_request['selected_text'][:50]}...")
    
    try:
        # Make request to the select endpoint
        response = requests.post(
            "http://localhost:8787/select",
            json=test_request,
            headers={"Content-Type": "application/json"},
            stream=True
        )
        
        if response.status_code == 200:
            print("✅ Request successful, streaming response:")
            print("-" * 60)
            
            # Process streaming NDJSON response
            full_response = ""
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line.decode('utf-8'))
                        if 'delta' in data:
                            print(data['delta'], end='', flush=True)
                            full_response += data['delta']
                        elif 'done' in data and data['done']:
                            print("\n" + "-" * 60)
                            print("✅ Stream completed successfully")
                            break
                        elif 'error' in data:
                            print(f"\n❌ Error in stream: {data['error']}")
                            return False
                    except json.JSONDecodeError as e:
                        print(f"\n❌ JSON decode error: {e}")
                        continue
            
            print(f"\n📊 Total response length: {len(full_response)} characters")
            return True
            
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed. Make sure the server is running on localhost:8787")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_without_context():
    """Test with a repo that doesn't exist in ChromaDB"""
    test_request = {
        "owner": "nonexistent",
        "repo": "repo",
        "sha": "main", 
        "file": "test.py",
        "selected_text": "print('hello world')",
        "language": "python"
    }
    
    print("\n🧪 Testing /select endpoint without ChromaDB context...")
    
    try:
        response = requests.post(
            "http://localhost:8787/select",
            json=test_request,
            headers={"Content-Type": "application/json"},
            stream=True
        )
        
        if response.status_code == 200:
            print("✅ Request successful (no context case)")
            return True
        else:
            print(f"❌ Request failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing enhanced /select endpoint functionality\n")
    
    # Test with context
    success1 = test_select_endpoint()
    
    # Test without context  
    success2 = test_without_context()
    
    if success1 and success2:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)
