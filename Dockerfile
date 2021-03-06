# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

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
