# Use a Node.js LTS version on Alpine Linux
FROM node:lts-alpine

# Install bash for the entryscript
RUN apk add --no-cache bash

# Create app directory
RUN mkdir -p /app

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port Vite uses for development
EXPOSE 5173

# Command to run the development server
CMD ["npm", "run", "dev", "--", "--host"]
