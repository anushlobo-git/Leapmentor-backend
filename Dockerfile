FROM node:20-alpine

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Copy package configurations and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application files and set ownership to the 'node' user
COPY --chown=node:node . .

# Expose backend port
EXPOSE 5000

# Switch to the non-root 'node' user
USER node

CMD ["npm", "start"]

