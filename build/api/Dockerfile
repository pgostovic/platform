FROM node:11

WORKDIR /app

COPY . /app

RUN npm i --production

EXPOSE 80

ENV PORT 80

CMD ["node", "main/api"]
