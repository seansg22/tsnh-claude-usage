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

# Bump version, commit, and tag
npm version "$BUMP" -m "chore: release v%s"
VERSION=$(node -p "require('./package.json').version")

echo ""
echo "🧹 Cleaning previous build artifacts..."
rm -rf release/

echo "📦 Building v$VERSION..."
pnpm dist:mac

# Push commit + tag
git push --follow-tags

# Create GitHub release and upload artifacts
echo ""
echo "🚀 Publishing to GitHub Releases..."
gh release create "v$VERSION" \
  --title "v$VERSION" \
  --generate-notes \
  release/*.dmg \
  release/*.zip

echo ""
echo "✅ Done! Download at:"
echo "   https://github.com/seansg22/tsnh-claude-usage/releases/tag/v$VERSION"
