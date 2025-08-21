@echo off
echo Starting Tender App Development Server...
echo Changing to frontend directory...
cd /d "C:\Users\hydra\tender\frontend"
echo Current directory: %CD%
echo.
echo Starting development server with images from: %CD%\public\images
echo App will be available at: http://localhost:5173/Tender-app/
echo.
npm run dev
pause