FROM node:20.11 as build
WORKDIR /usr/src/app
COPY package*.json package-lock.json ./
# The extra flags are to make sure that the build process doesn't fail due to network issues
RUN npm ci --loglevel verbose --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY . .
EXPOSE 3000
RUN npm run build
CMD [ "export", "NODE_ENV=production"]
CMD [ "node", "dist/index.js" ]