#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  SmartNav — Automated Setup Script
#  Run: bash setup.sh
# ═══════════════════════════════════════════════════════════════
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

print_step()  { echo -e "\n${CYAN}▶ $1${RESET}"; }
print_ok()    { echo -e "${GREEN}✓ $1${RESET}"; }
print_warn()  { echo -e "${YELLOW}⚠ $1${RESET}"; }
print_error() { echo -e "${RED}✗ $1${RESET}"; }

echo -e "${CYAN}"
echo "  ███████╗███╗   ███╗ █████╗ ██████╗ ████████╗███╗   ██╗ █████╗ ██╗   ██╗"
echo "  ██╔════╝████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝████╗  ██║██╔══██╗██║   ██║"
echo "  ███████╗██╔████╔██║███████║██████╔╝   ██║   ██╔██╗ ██║███████║██║   ██║"
echo "  ╚════██║██║╚██╔╝██║██╔══██║██╔══██╗   ██║   ██║╚██╗██║██╔══██║╚██╗ ██╔╝"
echo "  ███████║██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   ██║ ╚████║██║  ██║ ╚████╔╝ "
echo "  ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═══╝╚═╝  ╚═╝  ╚═══╝  "
echo -e "${RESET}"
echo "  Danger Detection System — YOLO26 + ByteTrack + MiDaS + TTS-VI"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. System dependencies ─────────────────────────────────────
print_step "Checking system dependencies..."

command -v python3 >/dev/null 2>&1 || { print_error "Python 3 not found. Install Python 3.10+"; exit 1; }
PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
print_ok "Python $PY_VER"

command -v node >/dev/null 2>&1 || { print_error "Node.js not found. Install Node.js 18+"; exit 1; }
print_ok "Node.js $(node --version)"

# espeak-ng for offline TTS
if ! command -v espeak-ng >/dev/null 2>&1; then
    print_warn "espeak-ng not found — trying to install..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get install -y espeak-ng 2>/dev/null || print_warn "Could not install espeak-ng. Online TTS (gTTS) will be used."
    else
        print_warn "Please install espeak-ng manually for offline TTS support."
    fi
else
    print_ok "espeak-ng available"
fi

# ── 2. Backend setup ───────────────────────────────────────────
print_step "Setting up backend..."

cd "$SCRIPT_DIR/backend"

# Create virtualenv if not exists
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_ok "Virtual environment created"
fi

source venv/bin/activate

# Install dependencies
pip install --upgrade pip -q
pip install -r requirements.txt -q
print_ok "Backend dependencies installed"

# Copy env file
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_ok ".env created from template"
fi

# Create model directories
mkdir -p models/yolo models/depth uploads outputs logs
print_ok "Directory structure ready"

# Check for YOLO model
if [ ! -f "models/yolo/yolo26.pt" ]; then
    print_warn "YOLO model not found at models/yolo/yolo26.pt"
    print_warn "Place your YOLO26 WOTR fine-tuned model there."
    print_warn "System will use YOLOv8n as fallback."
fi

deactivate

# ── 3. Frontend setup ──────────────────────────────────────────
print_step "Setting up frontend..."

cd "$SCRIPT_DIR/frontend"

if [ ! -f ".env" ]; then
    cp .env.example .env
    print_ok "Frontend .env created"
fi

npm install --silent
print_ok "Frontend dependencies installed"

# ── 4. Done ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  Setup complete!${RESET}"
echo -e "${GREEN}═══════════════════════════════════════════════${RESET}"
echo ""
echo "  To start the project:"
echo ""
echo -e "  ${CYAN}# Terminal 1 — Backend:${RESET}"
echo "  cd backend && source venv/bin/activate && python run.py"
echo ""
echo -e "  ${CYAN}# Terminal 2 — Frontend:${RESET}"
echo "  cd frontend && npm run dev"
echo ""
echo -e "  ${CYAN}# Or use the start script:${RESET}"
echo "  bash start.sh"
echo ""
echo -e "  ${CYAN}# Open in browser:${RESET}"
echo "  http://localhost:5173"
echo ""