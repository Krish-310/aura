#!/usr/bin/env bash
set -euo pipefail
(cd server && pip install -r requirements.txt)
(cd extension && yarn && yarn dev)
