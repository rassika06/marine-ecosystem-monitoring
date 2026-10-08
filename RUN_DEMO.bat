@echo off
setlocal
cd /d "%~dp0"
title Marine Ecosystem Monitoring - Correct Dashboard
echo.
echo ==============================================
echo  Marine Ecosystem Monitoring - NEW UI Launcher
echo ==============================================
echo Checking the new dashboard and ocean pictures.
echo This version automatically opens a FREE port.
echo It will NOT reuse localhost:5500 from your old project.
echo.
where py >nul 2>&1
if %errorlevel%==0 (
    py -3 launch_demo.py
) else (
    python launch_demo.py
)
if errorlevel 1 (
    echo.
    echo Unable to start. Check the error message above.
    echo Make sure Python is installed and extract ALL files.
)
echo.
pause
