FROM node:12

# Install FFMPEG
RUN wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
#RUN md5sum -c ffmpeg-release-amd64-static.tar.xz.md5
RUN tar xvf ffmpeg-release-amd64-static.tar.xz
RUN mv ffmpeg-4.2.1-amd64-static/ffmpeg /usr/local/bin
RUN rm -rf ffmpeg-release-amd64-static.tar.xz ffmpeg-4.2.1-amd64-static

RUN apt-get update && apt-get install -y zip

WORKDIR /service

COPY package*.json ./
RUN npm install --only=production

COPY lib ./lib
COPY index.js ./

CMD [ "npm", "start" ]