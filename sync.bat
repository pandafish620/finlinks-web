@echo off
cd /d "%~dp0"
echo 正在与 GitHub 同步...
git pull origin main
git add .
git commit -m "Auto-backup"
git push origin main
echo 同步完成！
pause