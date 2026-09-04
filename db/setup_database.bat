@echo off
:: Master setup script for Photo Clustering System database

echo ========================================
echo Photo Clustering System - Database Setup
echo ========================================
echo.
echo This script will:
echo  1. Create the training_jobs table
echo  2. Create default admin user
echo  3. Create default event
echo.

cd /d "%~dp0..\backend"

:: Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo ERROR: Virtual environment not found!
    echo Please run: cd backend ^&^& start_api.bat
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 1: Applying Database Schema
echo ========================================
echo.
python ..\db\apply_schema.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Schema application failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 2: Creating Default Data
echo ========================================
echo.
python ..\db\setup_default_data.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Default data creation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo DATABASE SETUP COMPLETE!
echo ========================================
echo.
echo You can now:
echo  1. Start the server: cd backend ^&^& python main.py
echo  2. Open the frontend: http://localhost:5174/ZAF/photo-clustering
echo  3. Upload photos to event_id=1
echo  4. Start training jobs
echo.
pause
