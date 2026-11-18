@echo off
REM Factory reset: removes containers, volumes, data, logs, and email, and restores the default muxcloud.json.
cd /d "%~dp0\.."
set /p CONFIRM=Type RESET to delete all Mux Cloud data: 
if /I not "%CONFIRM%"=="RESET" (
  echo Cancelled.
  exit /b 1
)
docker compose down -v
if exist data rmdir /s /q data
if exist logs rmdir /s /q logs
if exist email-outbox rmdir /s /q email-outbox
copy /y factory\muxcloud.json muxcloud.json
echo Factory reset complete.
