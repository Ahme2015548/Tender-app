# 🌐 CLOUD DEPLOYMENT: Docker container for timer API
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set timezone to match your local time (for 17:30 CRON)
ENV TZ=Asia/Riyadh

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server files
COPY . .

# Expose port (cloud platforms will override this)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start server
CMD ["npm", "start"]