FROM node:20-alpine

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Copy package configurations and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Safe: .dockerignore excludes .env, secrets, .git, node_modules, etc.
COPY --chown=node:node . .
RUN chmod -R a-w /app

# Expose backend port
EXPOSE 5000

# Switch to the non-root 'node' user
USER node

CMD ["npm", "start"]