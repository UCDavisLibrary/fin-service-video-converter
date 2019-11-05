FROM debian

RUN apt-get update && apt-get install -y zip wget xz-utils

# Install FFMPEG
RUN wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
#RUN md5sum -c ffmpeg-release-amd64-static.tar.xz.md5
RUN tar xvf ffmpeg-release-amd64-static.tar.xz
RUN mv ffmpeg-4.2.1-amd64-static/ffmpeg /usr/local/bin
RUN mv ffmpeg-4.2.1-amd64-static/ffprobe /usr/local/bin
RUN rm -rf ffmpeg-release-amd64-static.tar.xz ffmpeg-4.2.1-amd64-static

WORKDIR /opt
COPY convert.sh .
COPY playlist.m3u8 .
COPY template.ttl .