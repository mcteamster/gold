FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY controller/package*.json ./controller/
COPY view/package*.json ./view/
RUN npm install
COPY . .
RUN npm run build
EXPOSE 80
CMD npm start
