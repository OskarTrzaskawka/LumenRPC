; Extra steps for the Lumen RPC NSIS installer.
; The uninstaller itself is always installed (and listed in Settings > Apps); this adds a
; Start menu shortcut to it as well.

!macro NSIS_HOOK_POSTINSTALL
  CreateShortCut "$SMPROGRAMS\Uninstall ${PRODUCTNAME}.lnk" "$INSTDIR\uninstall.exe"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$SMPROGRAMS\Uninstall ${PRODUCTNAME}.lnk"
!macroend
