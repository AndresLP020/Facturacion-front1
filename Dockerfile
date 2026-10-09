FROM node:24-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci --include=dev
COPY frontend/tsconfig.json frontend/next-env.d.ts frontend/postcss.config.mjs frontend/next.config.ts ./frontend/
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public
COPY packages/contracts ./packages/contracts
RUN npm run build --workspace frontend

FROM node:24-bookworm-slim
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/package.json /repo/package-lock.json ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/frontend/package.json ./frontend/package.json
COPY --from=build /repo/frontend/.next ./frontend/.next
COPY --from=build /repo/frontend/public ./frontend/public
COPY --from=build /repo/frontend/next.config.ts ./frontend/next.config.ts
EXPOSE 3000
WORKDIR /repo/frontend
CMD ["npm", "run", "start"]
