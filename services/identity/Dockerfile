FROM node:18-alpine

WORKDIR /app

# Copy package files first for dependency caching
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy remaining source code
COPY . .

EXPOSE 5001

CMD ["npm", "start"]
