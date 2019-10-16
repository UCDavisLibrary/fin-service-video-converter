const {config} = require('@ucd-lib/fin-node-utils')

config.videoService = {
  // bucket : process.env.GCS_BUCKET || 'fin-video-converter',
  localStorage : {
    root : '/storage',
    uploads : '/storage/uploads',
    workspace : '/storage/workspace'
  }
}
config.workflow = {
  root : '/.workflow',
  name : process.env.SERVICE_NAME || 'video-service'
}

module.exports = config;