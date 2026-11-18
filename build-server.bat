@echo off
setlocal
if "%~1"=="" (
  echo Usage: build-server.bat ^<docker-image-tag^>
  echo Example: build-server.bat v2.0.0
  exit /b 1
)

set "IMAGE_TAG=%~1"
set "IMAGE_NAME=jchristn77/muxcloud-server"
cd /d "%~dp0"

rem The server image includes the dashboard (built in the image), served on the same origin as the API.
echo Building and pushing %IMAGE_NAME%:latest and %IMAGE_NAME%:%IMAGE_TAG%...
docker buildx build --builder cloud-jchristn77-jchristn77 --platform linux/amd64,linux/arm64/v8 -t %IMAGE_NAME%:latest -t %IMAGE_NAME%:%IMAGE_TAG% -f docker/server/Dockerfile --push . || exit /b 1

echo Pulling %IMAGE_NAME% into the local registry...
docker pull %IMAGE_NAME%:%IMAGE_TAG% || exit /b 1
docker pull %IMAGE_NAME%:latest || exit /b 1

echo Done.
endlocal
