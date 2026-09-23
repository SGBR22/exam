@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:8000"
  python app.py
  goto :end
)
where powershell >nul 2>nul
if errorlevel 1 (
  echo Не найден ни Python 3, ни PowerShell.
  echo Установите Python 3 и повторите запуск.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:8000"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
:end
pause
