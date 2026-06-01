# Use Node.js LTS version
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install dependencies
# RUN npm ci --only=production
RUN npm install

# Bundle app source
COPY . .

# Create logs directory
RUN mkdir -p logs && chmod 777 logs

# Create uploads directory structure
RUN mkdir -p ../uploads/profiles ../uploads/documents ../uploads/aadhaar ../uploads/driving-license && chmod -R 777 ../uploads

# Expose port
EXPOSE 8080

# Start command
CMD [ "npm", "start" ]
