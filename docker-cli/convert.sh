#! /bin/bash

BASE_CONFIG="-vf pad='ceil(iw/2)*2:ceil(ih/2)*2' -c:a aac -ar 48000 -c:v h264 -profile:v main -pix_fmt yuv420p -crf 20 -sc_threshold 0 -g 48 -keyint_min 48 -hls_time 4 -hls_playlist_type vod -hls_segment_type fmp4"
INPUT_FILE=$1

OUTPUT_DIR=$(dirname $INPUT_FILE)
filename=$(basename -- "$INPUT_FILE")
basename=$(echo "$INPUT_FILE" | cut -f 1 -d '.' | xargs basename)

BASE_DIR="$OUTPUT_DIR"
OUTPUT_DIR="$OUTPUT_DIR/$basename-stream"

if [ -d "$OUTPUT_DIR" ]; then
  echo "Directory $OUTPUT_DIR already exists.  Please delete and retry.";
  exit -1;
fi

echo $OUTPUT_DIR
mkdir -p $OUTPUT_DIR
cd $BASE_DIR

if [ ! -f "${OUTPUT_DIR}.ttl" ]; then
  sed "s/{{folderName}}/$basename-stream/g" /opt/template.ttl | sed "s/{{originalFile}}/${filename}/g" > "${OUTPUT_DIR}.ttl"
fi

ffmpeg -hide_banner -y -i ${INPUT_FILE} \
  ${BASE_CONFIG} -b:v 800k -maxrate 856k -bufsize 1200k -b:a 96k -hls_segment_filename ${OUTPUT_DIR}/${basename}_360p_%04d.mp4 ${OUTPUT_DIR}/360p.m3u8 \
  ${BASE_CONFIG} -b:v 1400k -maxrate 1498k -bufsize 2100k -b:a 128k -hls_segment_filename ${OUTPUT_DIR}/${basename}_480p_%04d.mp4 ${OUTPUT_DIR}/480p.m3u8 \
  ${BASE_CONFIG} -b:v 2800k -maxrate 2996k -bufsize 4200k -b:a 128k -hls_segment_filename ${OUTPUT_DIR}/${basename}_720p_%04d.mp4 ${OUTPUT_DIR}/720p.m3u8 \
  ${BASE_CONFIG} -b:v 5000k -maxrate 5350k -bufsize 7500k -b:a 192k -hls_segment_filename ${OUTPUT_DIR}/${basename}_1080p_%04d.mp4 ${OUTPUT_DIR}/1080p.m3u8

# echo "ffmpeg -hide_banner -y -i ${INPUT_FILE} \
#   ${BASE_CONFIG} -b:v 800k -maxrate 856k -bufsize 1200k -b:a 96k -hls_segment_filename ${OUTPUT_DIR}/${basename}_360p_%04d.mp4 ${OUTPUT_DIR}/360p.m3u8 \
#   ${BASE_CONFIG} -b:v 1400k -maxrate 1498k -bufsize 2100k -b:a 128k -hls_segment_filename ${OUTPUT_DIR}/${basename}_480p_%04d.mp4 ${OUTPUT_DIR}/480p.m3u8 \
#   ${BASE_CONFIG} -b:v 2800k -maxrate 2996k -bufsize 4200k -b:a 128k -hls_segment_filename ${OUTPUT_DIR}/${basename}_720p_%04d.mp4 ${OUTPUT_DIR}/720p.m3u8 \
#   ${BASE_CONFIG} -b:v 5000k -maxrate 5350k -bufsize 7500k -b:a 192k -hls_segment_filename ${OUTPUT_DIR}/${basename}_1080p_%04d.mp4 ${OUTPUT_DIR}/1080p.m3u8"