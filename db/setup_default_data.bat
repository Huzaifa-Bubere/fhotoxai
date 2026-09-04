@echo off
:: Setup default event and user in database

echo Setting up default data for Photo Clustering System...
echo.

cd /d "%~dp0..\backend"

:: Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo Warning: Virtual environment not found. Make sure mysql-connector-python is installed.
)

:: Run the setup script
python ..\db\setup_default_data.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Setup completed successfully!
    echo You can now upload photos to the system.
    echo ============================================
) else (
    echo.
    echo ============================================
    echo Setup failed. Please check the error above.
    echo ============================================
)

pause
