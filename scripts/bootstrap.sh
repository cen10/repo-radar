#!/bin/bash

# Only run in remote environments (Claude Code Web)
# Local CLI and Cursor sessions skip this since dependencies are already installed
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

echo "Installing dependencies for remote environment..."
npm install

# Create .env.local from task environment variables (if set)
# This allows secrets to persist across sessions via task configuration
ENV_FILE=".env.local"
if [ -n "$VITE_SUPABASE_URL" ] || [ -n "$VITE_SUPABASE_ANON_KEY" ] || [ -n "$VITE_TEST_GITHUB_TOKEN" ]; then
  echo "Creating $ENV_FILE from environment variables..."
  : > "$ENV_FILE"  # Create/truncate file
  [ -n "$VITE_SUPABASE_URL" ] && echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" >> "$ENV_FILE"
  [ -n "$VITE_SUPABASE_ANON_KEY" ] && echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> "$ENV_FILE"
  [ -n "$VITE_TEST_GITHUB_TOKEN" ] && echo "VITE_TEST_GITHUB_TOKEN=$VITE_TEST_GITHUB_TOKEN" >> "$ENV_FILE"
  echo "Created $ENV_FILE with $(wc -l < "$ENV_FILE") variables"
fi
