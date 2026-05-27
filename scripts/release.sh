#!/bin/bash
set -e

# Usage: ./scripts/release.sh [patch|minor|major]
BUMP=${1:-patch}

if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Ensure working tree is clean
if [[ -n $(git status --porcelain) ]]; then
  echo "Error: uncommitted changes. Please commit or stash first."
  exit 1
fi

# Bump version, commit, and tag (npm version does all three)
npm version "$BUMP" -m "chore: release v%s"

# Push commit + tag
git push --follow-tags

echo ""
echo "✅ Released! GitHub Actions is now building the DMG."
echo "   https://github.com/seansg22/tsnh-claude-usage/actions"
