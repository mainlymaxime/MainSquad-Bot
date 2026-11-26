FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production

RUN apk add --no-cache fontconfig ttf-dejavu

COPY package*.json ./

RUN npm ci --omit=dev

RUN npm install --no-save --package-lock=false @napi-rs/canvas@0.1.80

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
