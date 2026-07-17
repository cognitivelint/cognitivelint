#!/bin/bash

# CognitiveLint npm publish script
# Usage: ./publish.sh <OTP>

set -e

if [ -z "$1" ]; then
  echo "Usage: ./publish.sh <OTP>"
  echo "Example: ./publish.sh 123456"
  exit 1
fi

OTP=$1

echo "Publishing @cognitivelint packages with OTP: $OTP"
echo ""

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Publish in dependency order
packages=(
  "core"
  "parser-react"
  "config"
  "formatters"
  "ai"
  "rule-engine"
  "rules"
  "cli"
)

for pkg in "${packages[@]}"; do
  echo "Publishing @cognitivelint/$pkg..."
  (cd "$REPO_ROOT/packages/$pkg" && npm publish --access public --otp "$OTP")
  echo "@cognitivelint/$pkg published!"
  echo ""
done

echo "All packages published successfully!"
echo ""
echo "Install with:"
echo "  npm install -g @cognitivelint/cli"
echo ""
echo "Or run directly:"
echo "  npx @cognitivelint/cli scan"
