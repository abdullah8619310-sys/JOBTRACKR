# JobTrackr frontend — React (Vite) SPA.
#
# Two stages: build the static bundle with Node, then serve it with nginx.
# `vite preview` was deliberately not used — Vite's own docs describe it as
# a tool for previewing a build locally, not a production server; nginx is
# the simplest reliable option for serving an already-built static SPA.
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite inlines VITE_-prefixed env vars into the bundle at BUILD time (not
# runtime), so this must be a build arg, not a docker-compose `environment:`
# entry on the final container. Defaults to the backend's default published
# port for a zero-config `docker compose up`.
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
