#!/usr/bin/env bash
# emosh installer script
# Usage: curl -fsSL https://raw.githubusercontent.com/yourusername/emosh/master/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

# Determine target
case "$OS" in
    Linux)
        case "$ARCH" in
            x86_64) TARGET="linux-x86_64" ;;
            aarch64|arm64) TARGET="linux-aarch64" ;;
            *) echo "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
        esac
        ;;
    Darwin)
        case "$ARCH" in
            x86_64) TARGET="macos-x86_64" ;;
            arm64) TARGET="macos-aarch64" ;;
            *) echo "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
        esac
        ;;
    MINGW*|MSYS*|CYGWIN*)
        TARGET="windows-x86_64"
        BINARY_NAME="emosh.exe"
        ;;
    *)
        echo "${RED}Unsupported operating system: $OS${NC}"
        exit 1
        ;;
esac

BINARY_NAME="${BINARY_NAME:-emosh}"
REPO="yourusername/emosh"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

echo "${GREEN}Installing emosh for $OS ($ARCH)${NC}"

# Get latest release version
echo "Fetching latest release..."
LATEST_VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_VERSION" ]; then
    echo "${RED}Failed to fetch latest version${NC}"
    exit 1
fi

echo "Latest version: ${GREEN}$LATEST_VERSION${NC}"

# Construct download URL
if [ "$TARGET" = "windows-x86_64" ]; then
    ARCHIVE="emosh-${TARGET}.zip"
    DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_VERSION/$ARCHIVE"
else
    ARCHIVE="emosh-${TARGET}.tar.gz"
    DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_VERSION/$ARCHIVE"
fi

# Download and extract
echo "Downloading from $DOWNLOAD_URL..."
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

if ! curl -fsSL -o "$ARCHIVE" "$DOWNLOAD_URL"; then
    echo "${RED}Failed to download $DOWNLOAD_URL${NC}"
    rm -rf "$TMP_DIR"
    exit 1
fi

echo "Extracting archive..."
if [ "$TARGET" = "windows-x86_64" ]; then
    unzip -q "$ARCHIVE"
else
    tar xzf "$ARCHIVE"
fi

# Install binary
echo "Installing to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
chmod +x "$BINARY_NAME"
mv "$BINARY_NAME" "$INSTALL_DIR/"

# Cleanup
cd - > /dev/null
rm -rf "$TMP_DIR"

# Check if install dir is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo "${YELLOW}Warning: $INSTALL_DIR is not in your PATH${NC}"
    echo "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
    echo "  export PATH="$INSTALL_DIR:\$PATH""
fi

echo "${GREEN}✓ emosh installed successfully!${NC}"
echo ""
echo "Try it out:"
echo "  emosh grin"
echo "  emosh heart"
echo "  emosh        # Interactive mode"
echo ""
echo "For help:"
echo "  emosh --help"
