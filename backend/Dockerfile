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

# Cập nhật bản vá bảo mật Alpine, biên dịch native modules (bcrypt),
# sau đó gỡ bỏ build-deps và npm/yarn/corepack khỏi runtime image (Docker Hardening)
COPY package*.json ./
RUN apk upgrade --no-cache \
    && apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --omit=dev \
    && apk del .build-deps \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm \
              /usr/local/lib/node_modules/corepack \
              /usr/local/bin/npm \
              /usr/local/bin/npx \
              /usr/local/bin/corepack \
              /usr/local/bin/yarn \
              /usr/local/bin/yarnpkg \
              /opt/yarn*

# Copy thư mục dist đã biên dịch từ Stage 1 sang Stage 2
COPY --from=builder /app/dist ./dist

# Mở cổng 3001
EXPOSE 3001

# Lệnh khởi chạy ứng dụng chính
CMD ["node", "dist/main.js"]
