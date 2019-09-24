const storage = require('./storage');
const ldp = require('./ldp');
const config = require('./config');
const convert = require('./convert');
const path = require('path');
const fs = require('fs-extra');
const {URL} = require('url');

class VideoConverterModel {

  async convert(opts={}) {
    let {file, fcUrl, jwt, email} = opts;
    let {hostname, host} = this.getHost(fcUrl);

    let base = path.parse(file).base;
    let data = {
      host: hostname,
      filename: base
    }

    let id = await ldp.create(data, host, jwt, username);
    await storage.uploadFile({
      localFile: file,
      pairTreeId: id,
      filename: base,
      host: hostname
    });

    let responseOpts = {
      id,
      filename: base,
      localFile: file,
      host, hostname, email
    }

    convert
      .then((zipPath) => this.onConvertComplete(zipPath, responseOpts))
      .error(e => this.onConvertError(responseOpts, e));

    return id;
  }

  async onConvertComplete(zipPath, opts={}) {
    await storage.uploadFile({
      localFile: zipPath,
      pairTreeId: opts.id,
      filename: 'stream.zip',
      host: opts.hostname
    });

    await this.cleanup(opts.localFile, opts.id);
    await ldp.update(opts.host, opts.jwt, opts.id);
  }

  async onConvertError(opts={}, error) {
    await this.cleanup(opts.localFile, opts.id);

    let data = Object.assign({}, opts);
    delete data.jwt;

    data.error = {
      message: error.message,
      stack : error.stack
    }
    try {
      await ldp.update(opts.host, opts.jwt, opts.id, data, 'error');
    } catch(e) {

    }
  }

  async cleanup(localFile, id) {
    if( fs.existsSync(localFile) ) {
      await fs.remove(localFile);
    }

    let workspaceDir = path.join(config.videoService.localStorage.workspace, id);
    if( fs.existsSync(workspaceDir) ) {
      await fs.remove(workspaceDir);
    }
  }

  async delete(opts={}) {
    let {fcUrl, jwt, id} = opts;
    let {host} = this.getHost(fcUrl);

    await storage.deleteFolder({host, pairTreeId: id});
    await ldp.delete(host, jwt, id);
  }

  download(opts={}) {
    let {fcUrl, id} = opts;
    let {host} = this.getHost(fcUrl);

    return storage.getSignedFileUrl({
      host, 
      file: 'stream.zip',
      pairTreeId: id
    });
  }

  getHost(fcUrl) {
    let url = new URL(fcUrl);
    return {
      hostname: url.hostname,
      host : url.protocol+url.host
    }
  }

}

module.exports = new VideoConverterModel();