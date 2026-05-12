@echo off
echo ==============================================
echo 🏥 Starting MediAI Backend Server...
echo ==============================================

echo [1/2] Installing dependencies if needed...
call npm install

echo [2/2] Starting the server...
call npm start

pause     



