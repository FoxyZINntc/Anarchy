#!/usr/bin/env bash
# Gera "dist/Anarchy Setup.exe" a partir de um Linux, sem Wine.
# No Windows, use simplesmente: npm run dist:win
set -e
cd "$(dirname "$0")/.."
npx electron-builder --win dir --x64 -c.win.signAndEditExecutable=false
node desktop/set-icon.js dist/win-unpacked/Anarchy.exe
NSIS=$(ls -d ~/.cache/electron-builder/nsis/nsis-3* | head -1)
chmod +x "$NSIS/linux/makensis"
(cd desktop/build && NSISDIR="$NSIS" "$NSIS/linux/makensis" -V2 installer.nsi)
# edição do servidor: igual, mas já vem com o Supabase configurado (desktop/servidor-padrao.json, fora do git)
if [ -f desktop/servidor-padrao.json ]; then
  rm -rf dist/win-unpacked-servidor && cp -r dist/win-unpacked dist/win-unpacked-servidor
  cp desktop/servidor-padrao.json dist/win-unpacked-servidor/resources/app/desktop/
  (cd desktop/build && NSISDIR="$NSIS" "$NSIS/linux/makensis" -V2 -DSRC=../../dist/win-unpacked-servidor "-DOUT=../../dist/Anarchy Servidor Setup.exe" installer.nsi)
fi
ls -la dist/*.exe
