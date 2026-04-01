FROM node:22-bookworm-slim AS web-builder

WORKDIR /app/apps/web

COPY apps/web/package.json apps/web/package-lock.json ./

RUN npm ci

COPY apps/web ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_BASE_URL=/api
ENV API_INTERNAL_BASE_URL=http://127.0.0.1:8000

RUN npm run build


FROM python:3.11-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    DATA_DIR=/data \
    API_INTERNAL_BASE_URL=http://127.0.0.1:8000 \
    NEXT_PUBLIC_API_BASE_URL=/api

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

COPY apps/api/requirements.txt ./apps/api/requirements.txt
RUN pip install --no-cache-dir -r apps/api/requirements.txt

COPY apps/api ./apps/api
COPY --from=web-builder /app/apps/web ./apps/web

RUN mkdir -p /data

EXPOSE 3000 8000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir /app/apps/api & API_PID=$!; (cd /app/apps/web && node node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000) & WEB_PID=$!; trap 'kill $API_PID $WEB_PID' INT TERM; wait -n $API_PID $WEB_PID; STATUS=$?; kill $API_PID $WEB_PID; wait $API_PID $WEB_PID 2>/dev/null; exit $STATUS"]
