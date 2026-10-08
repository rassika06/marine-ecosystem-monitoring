@echo off
cd /d "%~dp0"
echo.
echo ======================================
echo   MarineScope - Optional Python API
echo ======================================
echo Default mode: REAL quality checks only.
echo For ML inference see README.md.
echo.
where py >nul 2>&1
if %errorlevel%==0 (
  set "PY=py"
) else (
  set "PY=python"
)
if not exist ".venv\Scripts\python.exe" (
  %PY% -m venv .venv
  if errorlevel 1 (echo Failed to create environment & pause & exit /b 1)
)
call ".venv\Scripts\activate.bat"
python -m pip install -r requirements.txt
if errorlevel 1 (echo Failed to install requirements & pause & exit /b 1)
echo.
echo API: http://localhost:8000/docs
uvicorn backend.app:app --host 127.0.0.1 --port 8000
pause
