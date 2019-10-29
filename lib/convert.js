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

module.exports = async function ffmpeg(localFile, outputDir) {
  if( fs.existsSync(outputDir) ) await fs.remove(outputDir);
  await fs.mkdirp(outputDir);

  console.log('creating stream');

  let fileInfo = path.parse(localFile);
  let cwd = fileInfo.dir;
  let cmd = `ffmpeg -hide_banner -y -i ${fileInfo.base} \
  ${BASE_CONFIG} -b:v 800k -maxrate 856k -bufsize 1200k -b:a 96k -hls_segment_filename ${outputDir}/${fileInfo.name}_360p_%04d.mp4 ${outputDir}/360p.m3u8 \
  ${BASE_CONFIG} -b:v 1400k -maxrate 1498k -bufsize 2100k -b:a 128k -hls_segment_filename ${outputDir}/${fileInfo.name}_480p_%04d.mp4 ${outputDir}/480p.m3u8 \
  ${BASE_CONFIG} -b:v 2800k -maxrate 2996k -bufsize 4200k -b:a 128k -hls_segment_filename ${outputDir}/${fileInfo.name}_720p_%04d.mp4 ${outputDir}/720p.m3u8 \
  ${BASE_CONFIG} -b:v 5000k -maxrate 5350k -bufsize 7500k -b:a 192k -hls_segment_filename ${outputDir}/${fileInfo.name}_1080p_%04d.mp4 ${outputDir}/1080p.m3u8`

  await _exec(cmd, cwd);

  console.log('writing playlist file');

  await fs.writeFile(path.join(outputDir, 'playlist.m3u8'), PLAYLIST_M3U8);

  console.log('writing zip file');

  cwd = path.resolve(outputDir, '..');
  await _exec(`zip -r ../${filename}.zip ./*`, cwd);

  return path.resolve(outputDir, '..', '..', filename+'.zip');
}

function _exec(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, {cwd, shell:'/bin/bash'}, (error, stdout, stderr) => {
      if( error ) reject(error);
      else resolve({stdout, stderr});
    });
  });
}