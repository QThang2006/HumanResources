#!/bin/bash
set -e

# ========================================================
# 🚀 HR ENTERPRISE - ZERO-DOWNTIME DEPLOYMENT & ROLLBACK
# ========================================================

DOCKER_USERNAME="${DOCKER_USERNAME:-qthang2006}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BACKEND_IMAGE="${DOCKER_USERNAME}/hr-backend:${IMAGE_TAG}"
FRONTEND_IMAGE="${DOCKER_USERNAME}/hr-frontend:${IMAGE_TAG}"
PROJECT_DIR="/var/www/HumanResources"
ENV_FILE="${PROJECT_DIR}/backend/.env"

echo "=========================================="
echo "🚀 BẮT ĐẦU QUY TRÌNH DEPLOY PHIÊN BẢN: ${IMAGE_TAG}"
echo "=========================================="

cd "${PROJECT_DIR}"

# 1. Lưu lại image hiện tại đang chạy làm phao cứu sinh (Rollback target)
OLD_BACKEND_IMAGE=$(docker inspect --format='{{.Config.Image}}' hr_backend 2>/dev/null || echo "")
echo "📌 Image Backend hiện tại: ${OLD_BACKEND_IMAGE:-'Chưa có (lần đầu chuyển từ PM2)'}"

# 2. Sao lưu thư mục Frontend tĩnh
if [ -d "${PROJECT_DIR}/frontend/dist" ]; then
  echo "📦 Tạo bản sao lưu dự phòng cho Frontend..."
  rm -rf "${PROJECT_DIR}/frontend/dist_backup"
  cp -r "${PROJECT_DIR}/frontend/dist" "${PROJECT_DIR}/frontend/dist_backup"
fi

# 3. Kéo Docker Image mới nhất từ Docker Hub
echo "📥 Đang tải Backend Image mới: ${BACKEND_IMAGE}..."
docker pull "${BACKEND_IMAGE}"

echo "📥 Đang tải Frontend Image mới: ${FRONTEND_IMAGE}..."
docker pull "${FRONTEND_IMAGE}"

# 4. Cập nhật mã nguồn Frontend tĩnh từ Frontend Image (không tốn CPU/RAM của VPS để build)
echo "🌐 Đang cập nhật tài nguyên Frontend tĩnh vào Nginx..."
mkdir -p "${PROJECT_DIR}/frontend/dist"
TEMP_FE_CID=$(docker create "${FRONTEND_IMAGE}")
docker cp "${TEMP_FE_CID}:/usr/share/nginx/html/." "${PROJECT_DIR}/frontend/dist/"
docker rm -f "${TEMP_FE_CID}" >/dev/null

# 5. Khởi động Backend Container mới
echo "⚙️ Đang tái khởi động Backend Container..."
# Dừng PM2 nếu đang chạy trên port 3001
pm2 stop hr-backend 2>/dev/null || true

docker stop hr_backend 2>/dev/null || true
docker rm -f hr_backend 2>/dev/null || true

docker run -d \
  --name hr_backend \
  --restart unless-stopped \
  --network host \
  --env-file "${ENV_FILE}" \
  "${BACKEND_IMAGE}"

# 6. Chờ và kiểm tra sức khỏe (Health Check)
echo "🔍 Đang kiểm tra sức khỏe Backend qua endpoint /api/health..."
HEALTHY=false
for i in {1..12}; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health || true)
  if [ "${HTTP_STATUS}" = "200" ]; then
    echo "✅ Health Check thành công (HTTP 200) ở lần thử thứ ${i}!"
    HEALTHY=true
    break
  fi
  echo "⏳ Lần ${i}/12: Backend chưa sẵn sàng (HTTP: ${HTTP_STATUS}), đợi 3 giây..."
  sleep 3
done

# 7. Xử lý kết quả: THÀNH CÔNG hoặc TỰ ĐỘNG ROLLBACK
if [ "${HEALTHY}" = true ]; then
  # Tải lại Nginx để nhận diện Frontend mới
  systemctl reload nginx 2>/dev/null || true
  # Dọn dẹp bản backup
  rm -rf "${PROJECT_DIR}/frontend/dist_backup"
  echo "=========================================="
  echo "🎉 DEPLOY THÀNH CÔNG RỰC RỠ!"
  echo "Phiên bản đang chạy: ${IMAGE_TAG}"
  echo "=========================================="
  exit 0
else
  echo "=========================================="
  echo "❌ CẢNH BÁO: HEALTH CHECK THẤT BẠI!"
  echo "Bắt đầu quy trình TỰ ĐỘNG ROLLBACK để bảo vệ hệ thống..."
  echo "=========================================="

  # Rollback Backend
  docker stop hr_backend 2>/dev/null || true
  docker rm -f hr_backend 2>/dev/null || true
  if [ -n "${OLD_BACKEND_IMAGE}" ]; then
    echo "🔄 Đang khởi động lại Backend phiên bản cũ: ${OLD_BACKEND_IMAGE}..."
    docker run -d \
      --name hr_backend \
      --restart unless-stopped \
      --network host \
      --env-file "${ENV_FILE}" \
      "${OLD_BACKEND_IMAGE}"
    echo "✅ Đã khôi phục Backend thành công."
  else
    echo "🔄 Khôi phục lại tiến trình PM2 trước đó..."
    pm2 restart hr-backend 2>/dev/null || true
  fi

  # Rollback Frontend
  if [ -d "${PROJECT_DIR}/frontend/dist_backup" ]; then
    echo "🔄 Khôi phục Frontend tĩnh về bản sao lưu cũ..."
    rm -rf "${PROJECT_DIR}/frontend/dist"
    mv "${PROJECT_DIR}/frontend/dist_backup" "${PROJECT_DIR}/frontend/dist"
    systemctl reload nginx 2>/dev/null || true
    echo "✅ Đã khôi phục Frontend thành công."
  fi

  echo "💥 Hệ thống đã được khôi phục về trạng thái an toàn trước đó."
  exit 1
fi
