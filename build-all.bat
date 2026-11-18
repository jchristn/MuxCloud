@echo off
setlocal
if "%~1"=="" (
  echo Usage: build-all.bat ^<docker-image-tag^>
  echo Example: build-all.bat v0.1.0-alpha
  exit /b 1
)

set "IMAGE_TAG=%~1"
cd /d "%~dp0"
call build-server.bat "%IMAGE_TAG%" || exit /b 1
endlocal
