; Instalador do Discordia
Unicode true
ManifestDPIAware true
!define APPNAME "Discordia"
!define VERSION "1.0.0"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Discordia"

Name "${APPNAME}"
Caption "Instalar o Discordia"
BrandingText "Discordia ${VERSION}"
!ifndef SRC
!define SRC "../../dist/win-unpacked"
!endif
!ifndef OUT
!define OUT "../../dist/Discordia Setup.exe"
!endif
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\Discordia"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 64

VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=1046 "ProductName" "Discordia"
VIAddVersionKey /LANG=1046 "FileDescription" "Instalador do Discordia"
VIAddVersionKey /LANG=1046 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1046 "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=1046 "LegalCopyright" ""

!include "MUI2.nsh"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao Discordia"
!define MUI_WELCOMEPAGE_TEXT "Chat, grupos, calls e compartilhamento de tela com seus amigos.$\r$\n$\r$\nClique em Instalar para continuar."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Discordia.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir o Discordia agora"
!define MUI_FINISHPAGE_TITLE "Discordia instalado"
!define MUI_FINISHPAGE_TEXT "Tem um atalho na área de trabalho e no menu Iniciar."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"

Section "Discordia" SecMain
  ; fecha o Discordia se estiver aberto, para poder atualizar os arquivos
  nsExec::Exec 'taskkill /IM "Discordia.exe" /F'
  Sleep 800
  SetOutPath "$INSTDIR"
  File /r "${SRC}/*.*"
  WriteUninstaller "$INSTDIR\Desinstalar Discordia.exe"
  CreateShortcut "$DESKTOP\Discordia.lnk" "$INSTDIR\Discordia.exe" "" "$INSTDIR\Discordia.exe" 0
  CreateShortcut "$SMPROGRAMS\Discordia.lnk" "$INSTDIR\Discordia.exe" "" "$INSTDIR\Discordia.exe" 0
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "Discordia"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "Discordia"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\Discordia.exe"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Desinstalar Discordia.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNKEY}" "EstimatedSize" 260000
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /IM "Discordia.exe" /F'
  Sleep 800
  Delete "$DESKTOP\Discordia.lnk"
  Delete "$SMPROGRAMS\Discordia.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Discordia"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "com.discordia.app"
SectionEnd
