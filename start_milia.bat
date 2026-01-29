@echo off
setlocal

:: WSLのユーザー名
set WSL_USER=megus
:: Clawdbotの作業ディレクトリ
set WORK_DIR=/home/megus/clawd

echo [Milia Launcher] Starting Milia (Clawdbot)...

:: 1. ゲートウェイが既に動いているか確認して、止まってたら起動
wsl -u %WSL_USER% -e bash -c "clawdbot gateway status || clawdbot gateway start"

:: 2. 作業ディレクトリに移動した状態のシェルを開く（オプション）
echo [Milia Launcher] Milia is now running in the background.
echo Opening WSL terminal at work directory...
wsl -u %WSL_USER% --cd %WORK_DIR%

pause
