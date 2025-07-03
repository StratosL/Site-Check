# Start from the official Node.js 18 Alpine image
FROM node:18-alpine

# Install git
RUN apk add --no-cache git

# Set the working directory inside the container
WORKDIR /usr/src/app

# Clone the repository and install dependencies
RUN git clone https://github.com/StratosL/Site-Check.git .
RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# The command to run when the container starts
CMD ["npm", "start"]