#!/bin/bash
# ========================================================
# 🚀 HR & ATS ECOSYSTEM - ONE-CLICK LAUNCHER (LINUX)
# ========================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "===================================================="
echo "  🚀 KHỞI ĐỘNG HỆ THỐNG QUẢN TRỊ NHÂN SỰ & ATS"
echo "===================================================="

# 1. Đảm bảo Docker Containers (MySQL 3307 & n8n 5678) đang chạy
echo "📦 [1/3] Kiểm tra Docker Containers..."
docker compose up -d

# 2. Khởi động Backend NestJS (Port 3001)
echo "⚙️ [2/3] Khởi động Backend (NestJS)..."
cd "$PROJECT_DIR/backend"
npm run start:dev &
BACKEND_PID=$!

# 3. Khởi động Frontend React (Port 5173)
echo "💻 [3/3] Khởi động Frontend (React + Vite)..."
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Toàn bộ hệ thống đã được khởi động!"
echo "   - Frontend : http://localhost:5173"
echo "   - Backend  : http://localhost:3001/api"
echo "   - n8n      : http://localhost:5678"
echo ""
echo "💡 Để dừng hệ thống: Nhấn Ctrl + C hoặc chạy ./stop.sh"
echo "===================================================="

# Tự động mở trình duyệt sau 3 giây
sleep 3
xdg-open "http://localhost:5173" 2>/dev/null || sensible-browser "http://localhost:5173" 2>/dev/null || true

# Bắt tín hiệu ngắt (Ctrl+C) để dọn dẹp các tiến trình con
trap "echo 'Đang dừng hệ thống...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
