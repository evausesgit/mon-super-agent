# Mon super agent : web (Next.js) + API, lancés ensemble par `npm start`.
# Reprend nixpacks.toml (npm ci, build du web, npm start) avec Node 22 corrigé.
# Image Debian (pas Alpine) : l'agent Hermes est un environnement Python monté
# depuis l'hôte (~/.hermes, ~/.local/share/uv), qui a besoin de la glibc.
FROM node:22-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Variable publique figée au build par Next.js (fournie par Coolify).
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY . .
RUN npm ci
RUN npm --workspace @mon-super-agent/web run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
