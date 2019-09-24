const config = require('./config');
const path = require('path');
const fs = require('fs');
const {Storage} = require('@google-cloud/storage');
const {URL} = require('url');

class GCSStorage {

  constructor() {
    let opts = {};
    if( fs.existsSync('/etc/fin/webapp-service-account.json') ) {
      opts.projectId = require('/etc/fin/webapp-service-account.json').project_id,
      opts.keyFilename = '/etc/fin/webapp-service-account.json'
    }

    this.storage = new Storage(opts);
    this.initBucket();
  }

  getBucket() {
    return this.storage.bucket(config.videoService.bucket);
  }

  /**
   * @method initBucket
   * @description ensure gcs bucket exits
   */
  async initBucket() {
    let exists = (await this.getBucket().exists())[0];
    if( exists ) return;
    await this.storage.createBucket(config.videoService.bucket);
  }

  getBucketPath(host, pairTreeId, file) {
    try {
      host = new URL(host).hostname;
    } catch(e) {}
    return path.join(host, pairTreeId, file);
  }

  getFileObject(host, pairTreeId, filename) {
    return this.getBucket().file(this.getBucketPath(host, pairTreeId, filename));
  }

  uploadFile(opts={}) {
    let localFile = opts.localFile;
    let gcsFile = this.getFileObject(opts.host, opts.pairTreeId, opts.filename);

    return new Promise((resolve, reject) => {
      fs.createReadStream(localFile)
        .pipe(gcsFile.createWriteStream())
        .on('error', (err) => reject(err))
        .on('finish', () => resolve());
    });
  }

  async deleteFolder(opts={}) {
    let prefix = path.join('/', opts.host, opts.pairTreeId);

    let files = await this.getBucket().getFiles({prefix});
    for( let file of files ) {
      await file.delete();
    }
  }

  getSignedFileUrl(opts={}) {
    return this.getFileObject(opts.host, opts.pairTreeId, opts.filename)
                .getSignedUrl({
                  action: 'read',
                  expires: Date.now()+(1000*60*60),
                  responseDisposition : `attachment; filename="${opts.filename}"`
                });
  }

}

module.exports = new GCSStorage();