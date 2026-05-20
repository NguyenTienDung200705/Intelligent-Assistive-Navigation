#!/bin/bash
# ═══════════════════════════════════════════════
#  SmartNav — Start all services
#  Run: bash start.sh
# ═══════════════════════════════════════════════

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}Starting SmartNav services...${RESET}\n"

# Kill old processes
pkill -f "python run.py"   2>/dev/null || true
pkill -f "vite"            2>/dev/null || true
sleep 1

# ── Backend ──────────────────────────────────────
echo -e "${CYAN}▶ Starting Backend (FastAPI) on :8000${RESET}"
cd "$SCRIPT_DIR/backend"
if [ -d "venv" ]; then
    source venv/bin/activate
fi
python run.py &
BACKEND_PID=$!
echo -e "${GREEN}  Backend PID: $BACKEND_PID${RESET}"

# Wait for backend to start
sleep 3

# ── Frontend ─────────────────────────────────────
echo -e "${CYAN}▶ Starting Frontend (Vite) on :5173${RESET}"
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}  Frontend PID: $FRONTEND_PID${RESET}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  SmartNav is running!${RESET}"
echo -e "${GREEN}═══════════════════════════════════════════════${RESET}"
echo ""
echo -e "  Frontend:  ${CYAN}http://localhost:5173${RESET}"
echo -e "  Backend:   ${CYAN}http://localhost:8000${RESET}"
echo -e "  API Docs:  ${CYAN}http://localhost:8000/docs${RESET}"
echo -e "  WebSocket: ${CYAN}ws://localhost:8000/ws/stream${RESET}"
echo ""
echo "  Press Ctrl+C to stop all services."
echo ""

# Trap Ctrl+C to kill both
trap "echo -e '\n${YELLOW}Stopping...${RESET}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait $BACKEND_PID $FRONTEND_PID