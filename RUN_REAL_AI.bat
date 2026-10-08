@echo off
setlocal
cd /d "%~dp0"
title MarineScope - Experimental Real AI Detector
echo.
echo =========================================================
echo   MarineScope - REAL Image Detection (YOLO-World)
echo =========================================================
echo This mode runs PRETRAINED experimental object detection.
echo It does not diagnose fish diseases or identify exact species.
echo The first run downloads Python packages and model weights.
echo Internet access is needed on the first run.
echo.
where py >nul 2>&1
if %errorlevel%==0 (
  set "PY=py"
) else (
  set "PY=python"
)
if not exist ".venv\Scripts\python.exe" (
  %PY% -m venv .venv
  if errorlevel 1 goto failed
)
call ".venv\Scripts\activate.bat"
python -m pip install -r requirements.txt
if errorlevel 1 goto failed
python -m pip install ultralytics
if errorlevel 1 goto failed
set "MODEL_MODE=yoloworld"
set "LLM_MODE=none"
set "CONFIDENCE_THRESHOLD=0.25"
echo.
echo =========================================================
echo Starting actual pretrained detection API at port 8000.
echo The first camera frame may download model weights.
echo Keep this window OPEN while you demonstrate the project.
echo =========================================================
echo.
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
if errorlevel 1 goto failed
goto done
:failed
echo.
echo Installation or startup failed.
echo You can still use RUN_API.bat for quality-only operation.
:done
pause
