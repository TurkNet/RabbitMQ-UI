# ─── Stage 1: Build Server ───────────────────────────────────────────────────
FROM node:20-alpine AS server-build

WORKDIR /app/server

COPY server/package.json ./
RUN npm install

COPY server/src ./src
COPY server/tsconfig.json ./

# Compile TypeScript → dist/
RUN npm run build && echo "Server build OK"

# ─── Stage 2: Build Client ───────────────────────────────────────────────────
FROM node:20-alpine AS client-build

WORKDIR /app/client

COPY client/package.json ./
RUN npm install

COPY client/src ./src
COPY client/public ./public
COPY client/index.html ./
COPY client/vite.config.ts ./
COPY client/tsconfig*.json ./
COPY client/postcss.config.js ./
COPY client/tailwind.config.js ./
RUN npm run build && echo "Client build OK"

# ─── Stage 3: Production Image ───────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app/server

# Copy compiled JS
COPY --from=server-build /app/server/dist ./dist
# Copy package.json (for ESM type field and scripts) + install prod deps only
COPY --from=server-build /app/server/package*.json ./
RUN npm install --omit=dev

# Copy Client Build Output
COPY --from=client-build /app/client/dist /app/client/dist

# Set permissions for both local (node user) and OpenShift (group 0)
RUN chown -R node:node /app && \
    chgrp -R 0 /app && \
    chmod -R g=u /app

COPY .env /app/server/.env
# Also give permissions to .env for OpenShift
RUN chgrp 0 /app/server/.env && \
    chmod g=u /app/server/.env

USER node
ENV NODE_ENV="production"

EXPOSE 3001

CMD ["node", "--env-file=.env", "dist/index.js"]
