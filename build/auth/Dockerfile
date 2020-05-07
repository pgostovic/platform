FROM node:11

WORKDIR /app

COPY . /app

RUN npm i --production

CMD ["node", "--inspect=0.0.0.0:9229", "main/auth"]
