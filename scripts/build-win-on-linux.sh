#!/usr/bin/env bash
# Gera "dist/Discordia Setup.exe" a partir de um Linux, sem Wine.
# No Windows, use simplesmente: npm run dist:win
set -e
cd "$(dirname "$0")/.."
npx electron-builder --win dir --x64 -c.win.signAndEditExecutable=false
node desktop/set-icon.js dist/win-unpacked/Discordia.exe
NSIS=$(ls -d ~/.cache/electron-builder/nsis/nsis-3* | head -1)
chmod +x "$NSIS/linux/makensis"
(cd desktop/build && NSISDIR="$NSIS" "$NSIS/linux/makensis" -V2 installer.nsi)
ls -la "dist/Discordia Setup.exe"
