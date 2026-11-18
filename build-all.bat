@echo off
setlocal
if "%~1"=="" (
  echo Usage: build-all.bat ^<docker-image-tag^>
  echo Example: build-all.bat v2.0.0
  exit /b 1
)

set "IMAGE_TAG=%~1"
cd /d "%~dp0"
call build-server.bat "%IMAGE_TAG%" || exit /b 1
endlocal
