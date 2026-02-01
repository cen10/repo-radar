#!/bin/bash

# Only run in remote environments (Claude Code Web)
# Local CLI and Cursor sessions skip this since dependencies are already installed
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

echo "Installing dependencies for remote environment..."
npm install --ignore-scripts
