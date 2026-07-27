@echo off
echo ==============================
echo   CoffeeShop POS - Starting
echo ==============================
echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo Failed to install dependencies.
    pause
    exit /b 1
)
echo.
echo Launching desktop app...
call npm run electron:dev
