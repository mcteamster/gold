FROM node:24-alpine
WORKDIR /app
COPY . /app
RUN npm install
RUN cd view
RUN npm install
RUN npm run build
RUN cd ..
EXPOSE 80
CMD npm run start
