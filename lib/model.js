const storage = require('./storage');
const ldp = require('./ldp');
const config = require('./config');
const convert = require('./convert');
const path = require('path');
const fs = require('fs-extra');
const {URL} = require('url');

class VideoConverterModel {

  async convert(opts={}) {
    let {filename, filepath, fcUrl, jwt, email, svcId, username} = opts;
    let {hostname, host} = this.getHost(fcUrl);

    let data = {
      host: hostname,
      filename: filename
    }

    console.log('ldp create');

    let id = await ldp.create(data, host, jwt, username);

    console.log('gcs upload');

    await storage.uploadFile({
      localFile: filepath,
      pairTreeId: id,
      filename: filename,
      host: hostname
    });

    let responseOpts = {
      id, svcId,
      filename, jwt,
      localFile: filepath,
      host, hostname, email
    }

    console.log('convert');

    convert(filepath, id, filename)
      .then((zipPath) => this.onConvertComplete(zipPath, responseOpts))
      .catch(e => this.onConvertError(responseOpts, e));

    return id;
  }

  async onConvertComplete(zipPath, opts={}) {

    console.log('gcs upload');

    await storage.uploadFile({
      localFile: zipPath,
      pairTreeId: opts.id,
      filename: 'stream.zip',
      host: opts.hostname
    });

    console.log('more cleanup');

    await this.cleanup(opts.localFile, opts.id);

    console.log('ldp update');

    await ldp.update(opts.host, opts.jwt, opts.id, null, null, opts.svcId);

    console.log('complete');
  }

  async onConvertError(opts={}, error) {
    console.log('convert error', error);

    await this.cleanup(opts.localFile, opts.id);

    let data = Object.assign({}, opts);
    delete data.jwt;

    data.error = {
      message: error.message,
      stack : error.stack
    }
    try {
      await ldp.update(opts.host, opts.jwt, opts.id, data, 'error', opts.svcId);
    } catch(e) {
      console.log(e);
    }
  }

  async cleanup(localFile, id) {
    if( fs.existsSync(localFile) ) {
      await fs.remove(localFile);
    }

    id = id.replace(/\/.workflow\//, '').replace(/\//g, '-');
    let workspaceDir = path.join(config.videoService.localStorage.workspace, id);
    if( fs.existsSync(workspaceDir) ) {
      await fs.remove(workspaceDir);
    }
  }

  async delete(opts={}) {
    let {fcUrl, jwt, id} = opts;
    let {host, hostname} = this.getHost(fcUrl);

    await storage.deleteFolder({hostname, pairTreeId: id});
    await ldp.delete(host, jwt, id);
  }

  download(opts={}) {
    let {fcUrl, id} = opts;
    let {host} = this.getHost(fcUrl);

    return storage.getSignedFileUrl({
      host, 
      filename: 'stream.zip',
      pairTreeId: id
    });
  }

  getHost(fcUrl) {
    let url = new URL(fcUrl);
    return {
      hostname: url.hostname,
      host : url.protocol+'//'+url.host
    }
  }

}

module.exports = new VideoConverterModel();