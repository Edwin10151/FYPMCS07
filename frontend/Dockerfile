FROM node:24-alpine AS build

WORKDIR /workspace/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/frontend/dist /usr/share/nginx/html
COPY MCS07/console /usr/share/nginx/html/prototype

