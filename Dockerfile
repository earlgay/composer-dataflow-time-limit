# Use the official Node.js 10 image.
FROM google/cloud-sdk:latest

# Create and change to the app directory.
WORKDIR /usr/src/app

# Install NodeJS
RUN apt-get update
RUN apt-get install curl gnupg -y
RUN curl -sL https://deb.nodesource.com/setup_12.x  | bash -
RUN apt-get install nodejs -y
RUN npm install

# Copy application dependency manifests to container image.
COPY package*.json ./

# Install production dependencies.
RUN npm install

# Copy local code to container image.
COPY . .

# Compile binary package
RUN npm run package

ENTRYPOINT ["./bin/df-time-limit"]
