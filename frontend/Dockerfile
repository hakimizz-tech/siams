ARG NODE_VERSION=22

#  deps: installed once, cached by the lockfile 
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

#  dev: used by docker compose (source is bind-mounted over /app) 
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

#  build: static assets (type-checks first) 
FROM deps AS build
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
COPY . .
RUN npm run build

#  prod: tiny, non-root, static 
FROM nginxinc/nginx-unprivileged:stable-alpine AS prod
ENV APP_NAME=SIAMS SENTRY_DSN="" ASSET_ORIGIN=""
USER root
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.inc.template /etc/nginx/templates/security-headers.inc.template
COPY nginx/config.json.template /etc/nginx/templates-app/config.json.template
COPY --chmod=755 nginx/40-render-config.sh /docker-entrypoint.d/40-render-config.sh
RUN chown -R 101:101 /usr/share/nginx/html /etc/nginx/templates-app
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/healthz || exit 1
