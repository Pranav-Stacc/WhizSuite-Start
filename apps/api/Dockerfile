# Build context: repository root.
# public.ecr.aws avoids Docker Hub rate limits in CI
FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
COPY packages/config/package.json packages/config/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter @agency-os/api...
COPY packages ./packages
COPY apps/api ./apps/api
ENV NODE_OPTIONS=--max-old-space-size=3072
RUN pnpm --filter @agency-os/contracts build \
  && pnpm --filter @agency-os/api exec prisma generate \
  && pnpm --filter @agency-os/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /repo /repo
USER node
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
