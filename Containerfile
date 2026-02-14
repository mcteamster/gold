FROM node:24-alpine
WORKDIR /app
COPY . /app
RUN npm install
WORKDIR /app/view
RUN npm install
RUN npm run build
WORKDIR /app
EXPOSE 80
CMD npm run start
