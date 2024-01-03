# ---- Base Node ----
FROM node:18 AS build
WORKDIR /app
COPY package.json ./
RUN yarn install
COPY . ./
RUN yarn build

# --- Release with Alpine ----
FROM node:18-alpine AS release
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/docs.yaml ./docs.yaml
RUN yarn install --production
CMD PORT=80 yarn start