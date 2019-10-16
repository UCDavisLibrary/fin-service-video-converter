const config = require('./config');
const path = require('path');
const fs = require('fs-extra');
const {Storage} = require('@google-cloud/storage');
const {URL} = require('url');

class GCSStorage {

  constructor() {
    let opts = {};
    if( fs.existsSync('/etc/fin/service-account.json') ) {
      opts.projectId = require('/etc/fin/service-account.json').project_id,
      opts.keyFilename = '/etc/fin/service-account.json'
    }

    this.storage = new Storage(opts);
  }

  getBucket(host) {
    console.log(host+'-service-workflows');
    return this.storage.bucket(host+'-service-workflows');
  }

  /**
   * @method initBucket
   * @description ensure gcs bucket exits
   */
  async initBucket(host) {
    let exists = await this.getBucket(host).exists();
    console.log(exists);
    exists = exists[0];
    if( exists ) return;
    await this.storage.createBucket(host+'-service-workflows');
  }

  getBucketPath(pairTreeId, file) {
    console.log(path.join(pairTreeId, file).replace(/^\//, ''));
    return path.join(pairTreeId, file).replace(/^\//, '');
  }

  getFileObject(host, pairTreeId, filename) {
    return this.getBucket(host).file(this.getBucketPath(pairTreeId, filename));
  }

  async uploadFile(opts={}) {
    await this.initBucket(opts.host);

    let localFile = opts.localFile;
    let gcsFile = this.getFileObject(opts.host, opts.pairTreeId, opts.filename);

    return new Promise((resolve, reject) => {
      fs.createReadStream(localFile)
        .pipe(gcsFile.createWriteStream())
        .on('error', (err) => reject(err))
        .on('finish', () => resolve());
    });
  }

  async downloadFile(id, host, gcsFile) {
    let pid = id.replace(/\/.workflow\//, '').replace(/\//g, '-');
    let workspaceDir = path.join(config.videoService.localStorage.workspace, pid);
    
    await fs.mkdirp(workspaceDir);
    let localFile = path.join(workspaceDir, path.parse(gcsFile).base);

    await this.getFileObject(host, id, path.parse(gcsFile).base).download({
      destination: localFile
    });

    return localFile;
  }

  async deleteFolder(opts={}) {
    let prefix = path.join(opts.hostname, opts.pairTreeId);
    let files = await this.getBucket().getFiles({prefix});
    if( files.length === 0 ) return;
    files = files[0];

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