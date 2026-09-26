# All-in-one mock-friendly demo (Mode A). Production HTTPS should use an external reverse proxy.
FROM node:20-bookworm AS build

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:20-bookworm AS run

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app
ENV NODE_ENV=production
ENV APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=http://localhost:4000
ENV DATABASE_URL=file:/app/data/app.db
ENV STORAGE_PATH=/app/storage
ENV MOCK_AI=true
ENV PORT=4000
ENV WORKER_POLL_INTERVAL_MS=2000
ENV WORKER_STALE_JOB_MS=900000

COPY --from=build /app /app

RUN mkdir -p /app/data /app/storage

COPY deploy/docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3000 4000
VOLUME ["/app/data", "/app/storage"]

CMD ["/start.sh"]
