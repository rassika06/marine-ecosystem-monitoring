@echo off
cd /d "%~dp0"
echo.
echo ======================================
echo   MarineScope - Presentation Dashboard
echo ======================================
echo Starting at http://localhost:5500
echo Keep this window open while presenting.
echo Press Ctrl+C to stop.
echo.
start "" "http://localhost:5500"
where py >nul 2>&1
if %errorlevel%==0 (
  py -m http.server 5500
) else (
  python -m http.server 5500
)
pause
