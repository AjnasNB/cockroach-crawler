FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY bin ./bin
COPY src ./src
COPY types ./types
COPY schemas ./schemas
COPY LICENSE README.md SECURITY.md ./

USER node
EXPOSE 3878
CMD ["node", "bin/cockroach-server.js"]
