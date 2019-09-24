const {exec} = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const BASE_CONFIG = '-vf pad="ceil(iw/2)*2:ceil(ih/2)*2" -c:a aac -ar 48000 -c:v h264 -profile:v main -crf 20 -sc_threshold 0 -g 48 -keyint_min 48 -hls_time 4 -hls_playlist_type vod -hls_segment_type fmp4';
const PLAYLIST_M3U8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=842x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8`;

module.exports = async function ffmpeg(videoFile) {
  let filePath = path.parse(videoFile);

  let streamFolder = path.join(filePath.dir, filePath.name);
  if( fs.existsSync(streamFolder) ) await fs.remove(streamFolder);
  await fs.mkdirp(streamFolder);

  let cwd = filePath.dir;
  let cmd = `ffmpeg -hide_banner -y -i ${filePath.base} \
  ${BASE_CONFIG} -b:v 800k -maxrate 856k -bufsize 1200k -b:a 96k -hls_segment_filename ${streamFolder}/${filePath.name}_360p_%04d.mp4 ${streamFolder}/360p.m3u8 \
  ${BASE_CONFIG} -b:v 1400k -maxrate 1498k -bufsize 2100k -b:a 128k -hls_segment_filename ${streamFolder}/${filePath.name}_480p_%04d.mp4 ${streamFolder}/480p.m3u8 \
  ${BASE_CONFIG} -b:v 2800k -maxrate 2996k -bufsize 4200k -b:a 128k -hls_segment_filename ${streamFolder}/${filePath.name}_720p_%04d.mp4 ${streamFolder}/720p.m3u8 \
  ${BASE_CONFIG} -b:v 5000k -maxrate 5350k -bufsize 7500k -b:a 192k -hls_segment_filename ${streamFolder}/${filePath.name}_1080p_%04d.mp4 ${streamFolder}/1080p.m3u8`

  await _exec(cmd, cwd);

  await fs.writeFile(path.join(streamFolder, 'playlist.m3u8'), PLAYLIST_M3U8);

  await _exec(`zip -r ../${filePath.name}.zip ./*`, cwd);

  await fs.remove(streamFolder);

  return path.join(filePath.dir, filePath.name+'.zip');
}

function _exec(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, {cwd, shell:'/bin/bash'}, (error, stdout, stderr) => {
      if( error ) reject(error);
      else resolve({stdout, stderr});
    });
  });
}