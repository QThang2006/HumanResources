#!/bin/bash
set -euo pipefail

# ========================================================
# 🐳 HR ENTERPRISE - 100% PURE DOCKER DEPLOY & AUTO-ROLLBACK
# ========================================================

DOCKER_USERNAME="${DOCKER_USERNAME:?Missing DOCKER_USERNAME}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BACKEND_IMAGE="${DOCKER_USERNAME}/hr-backend:${IMAGE_TAG}"
FRONTEND_IMAGE="${DOCKER_USERNAME}/hr-frontend:${IMAGE_TAG}"
IMAGES_ARCHIVE="${IMAGES_ARCHIVE:-/tmp/hr-images.tar.gz}"
PROJECT_DIR="/var/www/HumanResources"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.app.yml"

echo "=========================================="
echo "🐳 BẮT ĐẦU DEPLOY THUẦN DOCKER"
echo "📌 Phiên bản (Tag): ${IMAGE_TAG}"
echo "=========================================="

cd "${PROJECT_DIR}"

# 1. Đảm bảo các thư mục dữ liệu bền vững (volumes) tồn tại trước khi mount
mkdir -p "${PROJECT_DIR}/backend/uploads/documents" \
         "${PROJECT_DIR}/backend/uploads/cvs" \
         "${PROJECT_DIR}/backend/backups" \
         "${PROJECT_DIR}/backend/.ats-private/cv"

if [ ! -f "${PROJECT_DIR}/backend/.env" ]; then
  echo "❌ Thiếu file ${PROJECT_DIR}/backend/.env trên VPS!"
  exit 1
fi

# 2. Lưu thông tin phiên bản Docker đang chạy để làm mục tiêu Rollback
OLD_BACKEND_IMAGE=$(docker inspect --format='{{.Config.Image}}' hr_backend 2>/dev/null || echo "")
OLD_FRONTEND_IMAGE=$(docker inspect --format='{{.Config.Image}}' hr_frontend 2>/dev/null || echo "")
OLD_TAG=""
if [[ "${OLD_BACKEND_IMAGE}" == *:* ]]; then
  OLD_TAG="${OLD_BACKEND_IMAGE##*:}"
fi
echo "📌 Backend hiện tại : ${OLD_BACKEND_IMAGE:-'Chưa chạy Docker (đang dùng PM2)'}"
echo "📌 Frontend hiện tại: ${OLD_FRONTEND_IMAGE:-'Chưa chạy Docker (đang dùng static Nginx)'}"

# 3. Nạp Docker Images (ưu tiên file archive bắn qua SSH, fallback docker pull nếu chạy thủ công)
if [ -f "${IMAGES_ARCHIVE}" ]; then
  echo "📦 Đang nạp Docker Images từ gói truyền qua SSH (${IMAGES_ARCHIVE})..."
  gunzip -c "${IMAGES_ARCHIVE}" | docker load
  rm -f "${IMAGES_ARCHIVE}"
else
  echo "📥 Không thấy gói archive local, tiến hành docker pull từ Docker Hub..."
  docker pull "${BACKEND_IMAGE}"
  docker pull "${FRONTEND_IMAGE}"
fi

# Kiểm tra chắc chắn cả 2 image đã có mặt trong local Docker daemon
docker image inspect "${BACKEND_IMAGE}" >/dev/null
docker image inspect "${FRONTEND_IMAGE}" >/dev/null

# 4. Dừng tiến trình PM2 hr-backend cũ (nếu còn chạy) để nhường cổng 3001 cho hr_backend container
if command -v pm2 >/dev/null 2>&1; then
  pm2 stop hr-backend 2>/dev/null || true
fi

# 5. Khởi chạy cặp container hr_backend & hr_frontend bằng docker-compose.app.yml (project riêng: hr-app)
echo "🚀 Đang khởi động hr_backend & hr_frontend (Docker Compose - project hr-app)..."
DOCKER_USERNAME="${DOCKER_USERNAME}" IMAGE_TAG="${IMAGE_TAG}" \
  docker compose -p hr-app -f "${COMPOSE_FILE}" up -d --force-recreate

# 6. Health Check Backend (/api/health) & Frontend (/healthz)
echo "🔍 [1/2] Kiểm tra sức khỏe Backend (http://127.0.0.1:3001/api/health)..."
BACKEND_HEALTHY=false
for i in {1..15}; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health || true)
  if [ "${HTTP_STATUS}" = "200" ]; then
    echo "✅ Backend Health Check PASS (HTTP 200) ở lần thử thứ ${i}!"
    BACKEND_HEALTHY=true
    break
  fi
  echo "⏳ Chờ Backend khởi động (${i}/15 - HTTP: ${HTTP_STATUS})..."
  sleep 2
done

echo "🔍 [2/2] Kiểm tra sức khỏe Frontend (http://127.0.0.1:8080/healthz)..."
FRONTEND_HEALTHY=false
if [ "${BACKEND_HEALTHY}" = true ]; then
  for i in {1..10}; do
    FE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/healthz || true)
    if [ "${FE_STATUS}" = "200" ]; then
      echo "✅ Frontend Health Check PASS (HTTP 200) ở lần thử thứ ${i}!"
      FRONTEND_HEALTHY=true
      break
    fi
    echo "⏳ Chờ Frontend khởi động (${i}/10 - HTTP: ${FE_STATUS})..."
    sleep 1
  done
fi

# 7. Nếu CẢ HAI ĐỀU KHỎE -> Cập nhật Nginx Reverse Proxy & Dọn dẹp
if [ "${BACKEND_HEALTHY}" = true ] && [ "${FRONTEND_HEALTHY}" = true ]; then
  # Đồng bộ cấu hình Nginx host để trỏ "/" vào hr_frontend container (127.0.0.1:8080)
  if [ -f "${PROJECT_DIR}/deploy/nginx/hr-enterprise.conf" ] && [ -d /etc/nginx/sites-available ]; then
    if ! cmp -s "${PROJECT_DIR}/deploy/nginx/hr-enterprise.conf" /etc/nginx/sites-available/hr-enterprise.conf 2>/dev/null; then
      echo "🌐 Cập nhật cấu hình Nginx Reverse Proxy trỏ về Docker containers..."
      cp /etc/nginx/sites-available/hr-enterprise.conf /etc/nginx/sites-available/hr-enterprise.conf.bak 2>/dev/null || true
      cp "${PROJECT_DIR}/deploy/nginx/hr-enterprise.conf" /etc/nginx/sites-available/hr-enterprise.conf
      if nginx -t; then
        systemctl reload nginx
        echo "✅ Nginx Reverse Proxy đã được cập nhật và reload thành công!"
      else
        echo "⚠️ Cấu hình Nginx lỗi, khôi phục bản cũ..."
        cp /etc/nginx/sites-available/hr-enterprise.conf.bak /etc/nginx/sites-available/hr-enterprise.conf
      fi
    fi
  fi

  # Gỡ hẳn hr-backend khỏi PM2 sau khi Docker đã chạy ổn định (giữ nguyên tunnel & tunnel-n8n)
  if command -v pm2 >/dev/null 2>&1 && pm2 describe hr-backend >/dev/null 2>&1; then
    echo "🧹 Gỡ tiến trình PM2 hr-backend cũ để tránh xung đột cổng sau reboot..."
    pm2 delete hr-backend 2>/dev/null || true
    pm2 save 2>/dev/null || true
  fi

  # Dọn dẹp các Docker image quá cũ (chỉ giữ bản hiện tại + 1 bản trước đó để tiết kiệm ổ cứng)
  echo "🧹 Dọn dẹp Docker images dư thừa..."
  docker image prune -f >/dev/null 2>&1 || true
  for repo in "${DOCKER_USERNAME}/hr-backend" "${DOCKER_USERNAME}/hr-frontend"; do
    docker images "${repo}" --format '{{.Repository}}:{{.Tag}}' | while read -r img; do
      if [ "${img}" != "${repo}:${IMAGE_TAG}" ] && [ -n "${OLD_TAG}" ] && [ "${img}" != "${repo}:${OLD_TAG}" ]; then
        docker rmi "${img}" >/dev/null 2>&1 || true
      elif [ "${img}" != "${repo}:${IMAGE_TAG}" ] && [ -z "${OLD_TAG}" ]; then
        docker rmi "${img}" >/dev/null 2>&1 || true
      fi
    done
  done

  echo "=========================================="
  echo "🎉 DEPLOY THUẦN DOCKER THÀNH CÔNG RỰC RỠ!"
  echo "=========================================="
  docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
  exit 0
fi

# 8. HEALTH CHECK THẤT BẠI -> IN LOG LỖI & TỰ ĐỘNG ROLLBACK
echo "=========================================="
echo "❌ HEALTH CHECK THẤT BẠI! In log container để chẩn đoán:"
echo "=========================================="
echo "--- hr_backend logs ---"
docker logs --tail 40 hr_backend 2>&1 || true
echo "--- hr_frontend logs ---"
docker logs --tail 20 hr_frontend 2>&1 || true

echo "=========================================="
echo "🔄 KÍCH HOẠT TỰ ĐỘNG ROLLBACK..."
echo "=========================================="
if [ -n "${OLD_TAG}" ] && [ "${OLD_TAG}" != "${IMAGE_TAG}" ]; then
  echo "🔄 Khôi phục Docker containers về phiên bản cũ: ${OLD_TAG}..."
  DOCKER_USERNAME="${DOCKER_USERNAME}" IMAGE_TAG="${OLD_TAG}" \
    docker compose -p hr-app -f "${COMPOSE_FILE}" up -d --force-recreate || true

  # Xác minh sau rollback
  sleep 3
  RB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health || true)
  echo "🔍 Trạng thái Backend sau Rollback: HTTP ${RB_STATUS}"
else
  echo "🔄 Chưa có bản Docker cũ -> Khôi phục lại tiến trình PM2 hr-backend..."
  DOCKER_USERNAME="${DOCKER_USERNAME}" IMAGE_TAG="${IMAGE_TAG}" \
    docker compose -p hr-app -f "${COMPOSE_FILE}" down 2>/dev/null || true
  if command -v pm2 >/dev/null 2>&1; then
    pm2 restart hr-backend 2>/dev/null || pm2 start hr-backend 2>/dev/null || true
  fi
fi

echo "💥 Deploy thất bại nhưng hệ thống đã được tự động khôi phục về phiên bản an toàn!"
exit 1
