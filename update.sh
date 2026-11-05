#!/bin/bash
# ========================================================
# 🚀 HR ENTERPRISE ECOSYSTEM - PRODUCTION AUTO-UPDATE SCRIPT
# ========================================================
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo "🚀 ĐANG ĐỒNG BỘ MÃ NGUỒN MỚI NHẤT..."
echo "=========================================="

# 1. Kéo mã nguồn mới nhất từ GitHub
echo "📥 [1/4] Kéo Git mới nhất từ origin/main..."
git pull origin main

# 2. Cài đặt thư viện mới & Biên dịch Backend
echo "⚙️ [2/4] Build Backend NestJS..."
cd "$PROJECT_DIR/backend"
npm install --omit=dev
npm run build
pm2 restart hr-backend

# 3. Tái tạo container n8n nếu có thay đổi cấu hình Docker
echo "🐳 [3/4] Cập nhật các container Docker..."
cd "$PROJECT_DIR"
docker compose up -d

# 4. Tải lại cấu hình Nginx Web Server
echo "🌐 [4/4] Tải lại Nginx..."
systemctl reload nginx 2>/dev/null || true

echo "=========================================="
echo "🎉 HỆ THỐNG ĐÃ ĐỒNG BỘ THÀNH CÔNG!"
echo "=========================================="
pm2 status
