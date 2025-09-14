#!/bin/bash

echo "🚀 Starting GitHub Code Explainer..."

# Check if we're in the right directory
if [ ! -f "extension/package.json" ] || [ ! -f "server/requirements.txt" ]; then
    echo "❌ Please run this script from the aura project root directory"
    exit 1
fi

# Build the extension
echo "📦 Building extension..."
cd extension
if [ ! -d "node_modules" ]; then
    echo "Installing extension dependencies..."
    npm install
fi
npm run build
cd ..

# Check if Python virtual environment exists
if [ ! -d "server/venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    cd server
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    pip install sentence-transformers
    cd ..
fi

# Start the server
echo "🖥️  Starting server..."
cd server
source venv/bin/activate
echo "Server starting on http://localhost:8787"
echo "Press Ctrl+C to stop the server"
echo ""
python -m uvicorn app.app:app --reload --port 8787
