# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Qarrai Academy web app — production image
#   stage 1: install + type-check + build the static SPA
#   stage 2: unprivileged nginx with strict security headers (no root, read-only friendly)
#
# Build:  docker build \
#           --build-arg VITE_SUPABASE_URL=https://<project>.supabase.co \
#           --build-arg VITE_SUPABASE_ANON_KEY=<public anon key> \
#           -t qarrai-web .
# Run:    docker run -p 8080:8080 -e SUPABASE_URL=https://<project>.supabase.co qarrai-web
#
# Only PUBLIC values go into this image. AI keys and the service-role key live in
# Supabase Edge Function secrets, never here.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS build
WORKDIR /app
ENV CI=true
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" \
  || (echo "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY build args are required" && exit 1)
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
# SUPABASE_URL is injected into the Content-Security-Policy at container start (envsubst template)
ENV SUPABASE_URL=""
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
