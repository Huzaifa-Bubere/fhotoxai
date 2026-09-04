@echo off
:: Database setup script for AI Vision Architecture

echo ========================================
echo AI Vision Architecture - Database Setup
echo ========================================
echo.
echo This script will:
echo  1. Create the database if it doesn't exist
echo  2. Apply the database schema
echo  3. Insert default data
echo.
echo Make sure MySQL is running and configured in .env file
echo.
pause

:: Run database setup script
python create_database.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Database setup failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo DATABASE SETUP COMPLETE!
echo ========================================
echo.
echo The database has been successfully set up with:
echo  - Default roles (admin, organizer, photographer, participant)
echo  - Default users (admin, photographer, attendee)
echo  - Sample event (Annual Tech Conference 2026)
echo.
echo You can now start using the application.
echo.
pause