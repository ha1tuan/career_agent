# ==========================================
# STAGE 1: Build React Application (Vite)
# ==========================================
FROM node:20-alpine AS build-stage

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép các tệp package.json và package-lock.json trước để tận dụng cache
COPY package*.json ./

# Cài đặt sạch các dependencies (npm ci tối ưu và nhanh hơn npm install)
RUN npm ci

# Sao chép toàn bộ mã nguồn frontend vào container
COPY . .

# Nhận API URL từ docker-compose build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Thực hiện build ứng dụng React (Vite) thành mã tĩnh (HTML, CSS, JS)
RUN npm run build

# ==========================================
# STAGE 2: Production Nginx Server
# ==========================================
FROM nginx:1.25-alpine

# Sao chép các file tĩnh đã build từ Stage 1 sang thư mục root của Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Cấu hình Nginx tùy chỉnh để phục vụ SPA (React Router hỗ trợ, tránh lỗi 404 khi F5)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    error_page 500 502 503 504 /50x.html; \
    location = /50x.html { \
        root /usr/share/nginx/html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Mở cổng 80 của Nginx
EXPOSE 80

# Khởi chạy Nginx trong foreground để container duy trì hoạt động
CMD ["nginx", "-g", "daemon off;"]
