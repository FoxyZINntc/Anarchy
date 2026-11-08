; Instalador do Anarchy
Unicode true
ManifestDPIAware true
!define APPNAME "Anarchy"
!define VERSION "1.0.0"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Anarchy"

Name "${APPNAME}"
Caption "Instalar o Anarchy"
BrandingText "Anarchy ${VERSION}"
!ifndef SRC
!define SRC "../../dist/win-unpacked"
!endif
!ifndef OUT
!define OUT "../../dist/Anarchy Setup.exe"
!endif
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\Anarchy"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 64

VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=1046 "ProductName" "Anarchy"
VIAddVersionKey /LANG=1046 "FileDescription" "Instalador do Anarchy"
VIAddVersionKey /LANG=1046 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1046 "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=1046 "LegalCopyright" ""

!include "MUI2.nsh"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao Anarchy"
!define MUI_WELCOMEPAGE_TEXT "Chat, grupos, calls e compartilhamento de tela com seus amigos.$\r$\n$\r$\nClique em Instalar para continuar."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Anarchy.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir o Anarchy agora"
!define MUI_FINISHPAGE_TITLE "Anarchy instalado"
!define MUI_FINISHPAGE_TEXT "Tem um atalho na área de trabalho e no menu Iniciar."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"

Section "Anarchy" SecMain
  ; fecha o Anarchy se estiver aberto, para poder atualizar os arquivos
  nsExec::Exec 'taskkill /IM "Anarchy.exe" /F'
  Sleep 800
  SetOutPath "$INSTDIR"
  File /r "${SRC}/*.*"
  WriteUninstaller "$INSTDIR\Desinstalar Anarchy.exe"
  CreateShortcut "$DESKTOP\Anarchy.lnk" "$INSTDIR\Anarchy.exe" "" "$INSTDIR\Anarchy.exe" 0
  CreateShortcut "$SMPROGRAMS\Anarchy.lnk" "$INSTDIR\Anarchy.exe" "" "$INSTDIR\Anarchy.exe" 0
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "Anarchy"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "Anarchy"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\Anarchy.exe"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Desinstalar Anarchy.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNKEY}" "EstimatedSize" 260000
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /IM "Anarchy.exe" /F'
  Sleep 800
  Delete "$DESKTOP\Anarchy.lnk"
  Delete "$SMPROGRAMS\Anarchy.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Anarchy"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "com.discordia.app"
SectionEnd
