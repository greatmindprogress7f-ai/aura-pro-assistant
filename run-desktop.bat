@echo off
title Aura Pro 2.0 - Desktop Floating Overlay
set ELECTRON_RUN_AS_NODE=
cd /d "%~dp0desktop"
echo Starting Aura Pro 2.0 Desktop Floating Overlay...
start "" "%~dp0desktop\node_modules\electron\dist\electron.exe" "%~dp0desktop"
exit
