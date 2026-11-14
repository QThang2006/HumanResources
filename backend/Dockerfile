# ==========================================
# GIAI ĐOẠN 1: BUILD MÃ NGUỒN TYPESCRIPT
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Cài đặt công cụ biên dịch phụ trợ cho các thư viện C++ (như bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package.json và package-lock.json để tận dụng Docker layer cache
COPY package*.json ./

# Cài đặt toàn bộ dependencies (bao gồm devDependencies cho NestJS build)
RUN npm ci

# Copy toàn bộ mã nguồn
COPY . .

# Biên dịch mã nguồn TypeScript sang JavaScript trong thư mục dist/
RUN npm run build

# ==========================================
# GIAI ĐOẠN 2: RUNTIME MÔI TRƯỜNG PRODUCTION
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Cài đặt công cụ cần thiết cho native modules lúc cài production dependencies
RUN apk add --no-cache python3 make g++

# Chỉ copy package*.json và cài đặt các dependencies cần thiết cho runtime
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy thư mục dist đã biên dịch từ Stage 1 sang Stage 2
COPY --from=builder /app/dist ./dist

# Mở cổng 3001
EXPOSE 3001

# Lệnh khởi chạy ứng dụng chính
CMD ["node", "dist/main.js"]
