# syntax=docker/dockerfile:1
#
# Static SPA: Vite+ builds dist/, unprivileged nginx serves it on 8080.
# On the VPS, bind to loopback and let Caddy reverse_proxy:
#
#   reverse_proxy 127.0.0.1:8080
#
# Build-time VITE_* values are inlined by Vite and cannot change at runtime.

FROM ghcr.io/voidzero-dev/vite-plus:0.2.8 AS build
WORKDIR /app

COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN vp install --frozen-lockfile

COPY --chown=vp:vp . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN test -n "$VITE_SUPABASE_URL" \
    && test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" \
    && test -n "$VITE_API_BASE_URL"

RUN vp run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
