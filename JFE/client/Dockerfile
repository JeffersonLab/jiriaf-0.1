#Stage 1: Build the Angular application
FROM node:20.11-alpine as build
WORKDIR /user/src/app
COPY package.json package-lock.json ./
RUN npm ci --loglevel verbose
COPY . .
run npm install -g @angular/cli
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build user/src/app/dist/client/browser/ /usr/share/nginx/html
EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
