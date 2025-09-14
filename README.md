# GitHub Code Explainer

A Chrome extension that explains selected code using the full repository context from ChromaDB.

## 🚀 Quick Start

### Option 1: One-Command Setup (Recommended)

```bash
./setup.sh
```

This will:

- Build the extension
- Start the Docker server
- Test the connection
- Provide next steps

### Option 2: Manual Setup

1. **Build the extension:**

   ```bash
   cd extension
   npm install
   npm run build
   cd ..
   ```

2. **Start the server:**

   ```bash
   docker-compose up --build
   ```

3. **Load the extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension` folder

## 🎯 How to Use

1. **Go to any GitHub repository** (e.g., https://github.com/microsoft/vscode)
2. **Select any code** with your mouse
3. **See the tooltip** with explanation and full repository context!

## 📊 Features

- **Full Repository Context**: Shows the entire ingested codebase
- **Smart Positioning**: Tooltip appears above/below selection as needed
- **Syntax Highlighting**: Code blocks with proper formatting
- **Scrollable Content**: Handles large codebases
- **Dark Mode Support**: Automatically adapts to system theme
- **Error Handling**: Clear error messages and troubleshooting tips

## 🔧 Advanced Usage

### Ingest a Repository for Full Context

To get the complete codebase context, ingest a repository first:

```bash
curl -X POST 'http://localhost:8787/ingest' \
  -H 'Content-Type: application/json' \
  -d '{"repo": "microsoft/vscode", "prNumber": 1, "head_sha": "main"}'
```

### Check Server Status

```bash
curl http://localhost:8787/status?repo=test&prNumber=1&commit=main
```

## 🐳 Docker Commands

```bash
# Start the server
docker-compose up

# Start in background
docker-compose up -d

# Stop the server
docker-compose down

# View logs
docker-compose logs

# Rebuild and start
docker-compose up --build
```

## 🛠️ Development

### Server Development

The server is built with:

- **FastAPI**: Web framework
- **ChromaDB**: Vector database for code embeddings
- **Sentence Transformers**: For generating embeddings
- **Docker**: Containerized deployment

### Extension Development

The extension is built with:

- **Vanilla JavaScript**: No frameworks, lightweight
- **Vite**: Build tool
- **Chrome Extension Manifest V3**: Modern extension format

### Project Structure

```
aura/
├── extension/           # Chrome extension
│   ├── src/
│   │   └── content.js   # Main extension logic
│   ├── manifest.json    # Extension manifest
│   └── package.json     # Extension dependencies
├── server/              # FastAPI server
│   ├── app/
│   │   ├── app.py       # Main server file
│   │   ├── models.py    # Pydantic models
│   │   ├── vectordb.py  # ChromaDB integration
│   │   └── ...
│   ├── Dockerfile       # Server container
│   └── requirements.txt # Python dependencies
├── docker-compose.yml   # Docker orchestration
└── setup.sh            # One-command setup
```

## 🔍 Troubleshooting

### Extension Shows "Analyzing code..." Forever

1. **Check if server is running:**

   ```bash
   curl http://localhost:8787/status?repo=test&prNumber=1&commit=main
   ```

2. **Check Docker logs:**

   ```bash
   docker-compose logs
   ```

3. **Restart the server:**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

### No Tooltip Appears

1. **Check browser console** for errors (F12 → Console)
2. **Make sure you're on GitHub** (github.com domain)
3. **Try selecting code** in a file view (not just the file list)

### Server Connection Errors

1. **Make sure Docker is running**
2. **Check if port 8787 is available:**
   ```bash
   lsof -i :8787
   ```
3. **Try restarting Docker:**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

## 📝 API Endpoints

- `GET /status?repo={repo}&prNumber={pr}&commit={commit}` - Check server status
- `POST /ingest` - Ingest a repository into ChromaDB
- `POST /select` - Get code explanation with repository context

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `./setup.sh`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
