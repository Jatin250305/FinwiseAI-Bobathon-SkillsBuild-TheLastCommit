# ── Frontend Dockerfile (multi-stage) ────────────────────────────────────────

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer unless package files change)
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy source
COPY . .

# Build with the API base URL pointing to /api (nginx proxies to backend)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# Stage 2: Serve
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config and built assets
COPY nginx.conf /etc/nginx/conf.d/finwise.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
