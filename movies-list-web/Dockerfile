# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Create React App inlines env vars at build time, so the browser-facing API
# URL has to be known here rather than at container start.
ARG REACT_APP_SERVER_URL=http://localhost:8291
ENV REACT_APP_SERVER_URL=$REACT_APP_SERVER_URL
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime

# Serve on 8080 so the worker processes need no privileged port, and point
# nginx's writable paths somewhere an unprivileged user owns.
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/build /usr/share/nginx/html

RUN touch /run/nginx.pid \
 && chown -R nginx:nginx /run/nginx.pid /var/cache/nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
