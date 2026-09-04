@echo off
:: Apply database schema - create missing tables

echo Applying database schema...
echo This will create the training_jobs table if it doesn't exist.
echo.

cd /d "%~dp0..\backend"

:: Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo Warning: Virtual environment not found.
)

:: Run the schema script
python ..\db\apply_schema.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Schema applied successfully!
    echo ============================================
) else (
    echo.
    echo ============================================
    echo Schema application failed. 
    echo Please check the error above.
    echo ============================================
)

pause
