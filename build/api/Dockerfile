FROM node:12

WORKDIR /app

COPY . /app

RUN npm i --production

EXPOSE 80

ENV PORT 80

CMD ["node", "--inspect=0.0.0.0:9229", "main/api"]
