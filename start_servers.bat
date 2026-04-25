@echo off
echo Starting QMS Chatbot Services...

:: Start Backend
start cmd /k "cd backend && .\venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 300"

:: Start Frontend
start cmd /k "cd frontend && npm run dev"

echo Services started!
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
