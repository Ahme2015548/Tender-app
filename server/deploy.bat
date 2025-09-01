@echo off
REM 🌐 CLOUD DEPLOYMENT: Windows batch script for timer API deployment

echo 🚀 Timer API Cloud Deployment Script (Windows)
echo =============================================

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed  
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install Node.js with npm.
    pause
    exit /b 1
)

echo ℹ️  Checking Firebase configuration...

REM Check for Firebase service account
if exist "..\firebase-service-account.json" (
    echo ✅ Firebase service account file found
) else if defined FIREBASE_SERVICE_ACCOUNT_KEY (
    echo ✅ Firebase service account environment variable found
) else (
    echo ❌ Firebase service account not configured!
    echo ⚠️  Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable
    echo ⚠️  Or place firebase-service-account.json in project root
    pause
    exit /b 1
)

echo ℹ️  Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ℹ️  Choose deployment platform:
echo 1) Railway (recommended - easy setup)
echo 2) Render (free tier available)
echo 3) Vercel (serverless functions) 
echo 4) Heroku (classic PaaS)
echo.
set /p choice=Enter choice (1-4): 

if "%choice%"=="1" goto railway
if "%choice%"=="2" goto render
if "%choice%"=="3" goto vercel
if "%choice%"=="4" goto heroku
goto invalid

:railway
echo ℹ️  Deploying to Railway...
where railway >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Railway CLI not installed
    echo ℹ️  Install: npm install -g @railway/cli
    pause
    exit /b 1
)
railway login
railway up
echo ✅ Railway deployment complete
railway status
goto end

:render
echo ℹ️  Deploying to Render...
echo ⚠️  Render deployment requires manual setup via dashboard
echo ℹ️  1. Connect your GitHub repository to Render
echo ℹ️  2. Create new Web Service from server/ directory
echo ℹ️  3. Set environment variables in Render dashboard
echo ℹ️  4. Deploy will happen automatically
echo ✅ Render deployment instructions provided
goto end

:vercel
echo ℹ️  Deploying to Vercel...
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not installed
    echo ℹ️  Install: npm install -g vercel
    pause
    exit /b 1
)
vercel --prod
echo ✅ Vercel deployment complete
goto end

:heroku
echo ℹ️  Deploying to Heroku...
where heroku >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Heroku CLI not installed
    echo ℹ️  Install: https://devcenter.heroku.com/articles/heroku-cli
    pause
    exit /b 1
)

REM Check if Heroku app exists
heroku apps | findstr "tender-timer-api" >nul
if %errorlevel% neq 0 (
    echo ℹ️  Creating Heroku app...
    heroku create tender-timer-api
)

echo ℹ️  Setting environment variables...
heroku config:set NODE_ENV=production
heroku config:set TZ=Asia/Riyadh

if defined FIREBASE_SERVICE_ACCOUNT_KEY (
    heroku config:set FIREBASE_SERVICE_ACCOUNT_KEY="%FIREBASE_SERVICE_ACCOUNT_KEY%"
)

git push heroku main
echo ✅ Heroku deployment complete
goto end

:invalid
echo ❌ Invalid choice
pause
exit /b 1

:end
echo.
echo ✅ Cloud deployment process complete!
echo ℹ️  Your timer API now runs 24/7 with automatic 17:30 daily snapshots
echo ⚠️  Don't forget to update your web app's API URL to point to cloud server
echo.
pause