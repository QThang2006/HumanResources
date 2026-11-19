# ==========================================
# GIAI ĐOẠN 1: BUILD REACT VITE MÃ NGUỒN
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package*.json để tận dụng Docker layer cache
COPY package*.json ./
RUN npm ci

# Copy toàn bộ mã nguồn Frontend
COPY . .

# Biên dịch mã nguồn React (tsc -b && vite build -> thư mục dist/)
RUN npm run build

# ==========================================
# GIAI ĐOẠN 2: CHẠY BẰNG NGINX SIÊU NHẸ (~25MB)
# ==========================================
FROM nginx:alpine AS runner

# Cập nhật bản vá bảo mật cho hệ điều hành Alpine Linux
RUN apk upgrade --no-cache

# Xóa cấu hình mặc định của Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy file cấu hình Nginx tối ưu cho React SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy thư mục dist đã biên dịch từ Stage 1 sang thư mục web của Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Mở cổng 80
EXPOSE 80

# Chạy Nginx ở chế độ tiền cảnh (foreground)
CMD ["nginx", "-g", "daemon off;"]
