#!/bin/bash
set -e

echo "🏙️  Starting Smart City Analytics Platform..."

# Backend
echo "▶ Starting Backend (FastAPI) on port 8000..."
cd "$(dirname "$0")/backend"
python3 run.py &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to be ready
for i in $(seq 1 20); do
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "  ✅ Backend ready!"
    break
  fi
  sleep 1
done

# Frontend
echo "▶ Starting Frontend (React/Vite) on port 5173..."
cd "$(dirname "$0")/frontend"
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "════════════════════════════════════════"
echo "  🏙️  Smart City Platform Running!"
echo "════════════════════════════════════════"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo "════════════════════════════════════════"
echo ""
echo "Demo Credentials:"
echo "  admin   / admin123   (full access)"
echo "  analyst / analyst123 (analytics access)"
echo "  viewer  / viewer123  (read-only)"
echo ""
echo "Press Ctrl+C to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
