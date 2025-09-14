#!/bin/bash

echo "🚀 Setting up GitHub Code Explainer..."

# Build the extension
echo "📦 Building extension..."
cd extension
npm install
npm run build
cd ..

# Build and start the Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up --build -d

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 10

# Test the server
echo "🧪 Testing server..."
curl -f http://localhost:8787/status?repo=test&prNumber=1&commit=main

if [ $? -eq 0 ]; then
    echo "✅ Server is running successfully!"
    echo ""
    echo "🎉 Setup complete! Here's what to do next:"
    echo ""
    echo "1. Load the extension in Chrome:"
    echo "   - Go to chrome://extensions/"
    echo "   - Enable 'Developer mode'"
    echo "   - Click 'Load unpacked'"
    echo "   - Select the 'extension' folder"
    echo ""
    echo "2. Test the extension:"
    echo "   - Go to any GitHub repository"
    echo "   - Select some code"
    echo "   - See the tooltip with explanation!"
    echo ""
    echo "3. To ingest a repository for full context:"
    echo "   curl -X POST 'http://localhost:8787/ingest' \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"repo\": \"microsoft/vscode\", \"prNumber\": 1, \"head_sha\": \"main\"}'"
    echo ""
    echo "4. To stop the server:"
    echo "   docker-compose down"
else
    echo "❌ Server failed to start. Check the logs with:"
    echo "   docker-compose logs"
fi
