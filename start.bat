@echo off
cd /d %~dp0

echo ==============================
echo Starting project...
echo ==============================

docker compose up -d --build

echo ==============================
echo Site is running at:
echo http://localhost:8080
echo ==============================

start http://localhost:8080

pause