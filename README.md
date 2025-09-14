# aura

```
cd extension
npm run build
```

```
cd server
pip install -r requirements.txt
bash uvicorn.run.sh
```

```
export REPO="owner/name"
export PR_NUM=1
export COMMIT="commit-sha"
export GIT_URL="https://github.com/owner/name.git"
python server/workers/indexer.py
```