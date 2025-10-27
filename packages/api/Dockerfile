# Simple Dockerfile for Prognos API (packages/api)
FROM node:18-alpine

LABEL org.opencontainers.image.title="Prognos API"
LABEL org.opencontainers.image.description="Backend API for Prognos (packages/api)"

WORKDIR /usr/src/app

# Install dependencies, build, then prune dev deps for slimmer runtime image
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Remove dev deps to keep image small
RUN npm prune --production

EXPOSE 4000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
