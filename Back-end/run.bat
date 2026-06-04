@echo off
REM Start the Memora backend (avoids the Device Guard-blocked uvicorn.exe)
python -m uvicorn app.main:app --reload --port 8000
