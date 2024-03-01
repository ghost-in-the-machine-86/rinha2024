FROM node:21.6.1-alpine3.19
WORKDIR /app

COPY ./src/index.js /app
COPY ./src/package.json /app

COPY . .

RUN npm i

CMD ["sh", "-c", "npm start"]