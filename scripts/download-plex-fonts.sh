#!/bin/bash
# Script to download IBM Plex Sans static TTF fonts for OpenGraph images
# These fonts are needed because variable fonts are not supported by Satori

set -e

FONT_DIR="public/fonts"
BASE_URL="https://github.com/IBM/plex/raw/master/IBM-Plex-Sans/fonts/complete/ttf"

mkdir -p "$FONT_DIR"

echo "Downloading IBM Plex Sans Regular..."
curl -L -k -o "$FONT_DIR/IBMPlexSans-Regular.ttf" \
  "$BASE_URL/IBMPlexSans-Regular.ttf" || \
curl -L --insecure -o "$FONT_DIR/IBMPlexSans-Regular.ttf" \
  "$BASE_URL/IBMPlexSans-Regular.ttf"

echo "Downloading IBM Plex Sans Bold..."
curl -L -k -o "$FONT_DIR/IBMPlexSans-Bold.ttf" \
  "$BASE_URL/IBMPlexSans-Bold.ttf" || \
curl -L --insecure -o "$FONT_DIR/IBMPlexSans-Bold.ttf" \
  "$BASE_URL/IBMPlexSans-Bold.ttf"

echo "✅ Fonts downloaded successfully!"
ls -lh "$FONT_DIR"/IBMPlexSans-*.ttf

