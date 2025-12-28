@echo off
chcp 65001 >nul
if exist Z:\ (
    echo Z: is already mapped.
) else (
    subst Z: .
    echo Z: mapped.
)
Z:
echo Starting Adaptive Projection Device on Z:...
call npm run dev
pause
