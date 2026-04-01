# Use official Playwright image for all system dependencies
FROM mcr.microsoft.com/playwright:v1.48.0-focal

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (as root)
# The postinstall script in package.json will run:
# "postinstall": "npx playwright install --with-deps chromium"
# Since we're in the official playwright image, this will be fast
# and --with-deps will ensure any missing system libraries are installed.
RUN npm install

# Copy the rest of the application
COPY . .

# Build the frontend (creates the dist folder for the server to serve)
# This uses 'npx expo export --platform web' from package.json
RUN npm run build

# Expose the backend port
ENV PORT=8000
EXPOSE 8000

# Start the application using tsx to run the server
CMD ["npm", "start"]
