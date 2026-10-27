# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /src
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cognitivelint/ci-server... run build
RUN pnpm --filter @cognitivelint/ci-server deploy --prod /deploy

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3848
ENV SQLITE_PATH=/data/cognitivelint-ci.sqlite
COPY --from=build /deploy ./
VOLUME ["/data"]
EXPOSE 3848
CMD ["node", "dist/index.js"]
