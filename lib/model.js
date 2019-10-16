const storage = require('./storage');
const config = require('./config');
const convert = require('./convert');
const path = require('path');
const fs = require('fs-extra');
const pubsub = require('./pubsub');
const {URL} = require('url');

class VideoConverterModel {

  async convert(opts={}) {
    let hostname;
    let {gcsFile, host, jwt, email, svcId, username, workflowId} = opts;
    ({hostname, host} = this.getHost(host));

    let data = {gcsFile}

    let jsonld = [{
      "digital.ucdavis.edu/schema#workflowData": [{
        "@value" : JSON.stringify(data),
      }],
      "http://schema.org/description": [{
        "@value": "Video stream conversion service"
      }],
      "http://schema.org/status": [{
        "@value": "running"
      }]
    }]
    pubsub.sendMessage('update', jsonld, workflowId);

    // let id = await ldp.create(data, host, jwt, username);

    console.log('gcs download');
    let localFile = await storage.downloadFile(workflowId, hostname, gcsFile);

    // await storage.uploadFile({
    //   localFile: filepath,
    //   pairTreeId: workflowId,
    //   filename: filename,
    //   host: hostname
    // });

    let responseOpts = {
      id: workflowId, svcId,
      localFile,
      gcsFile, jwt,
      host, hostname, email
    }

    console.log('convert');

    convert(localFile, workflowId)
      .then((zipPath) => this.onConvertComplete(zipPath, responseOpts))
      .catch(e => this.onConvertError(responseOpts, e));
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

    await this.cleanup(opts.id);

    console.log('pub/sub update');

    // await ldp.update(opts.host, opts.jwt, opts.id, null, null, opts.svcId);
    let jsonld = {
      "http://schema.org/status": [{
        "@value": "complete"
      }],
      "http://schema.org/url": [{
        "@id": opts.host+'/svc:'+opts.svcId+opts.id
      }]
    }
    pubsub.sendMessage('update', jsonld, opts.id);

    console.log('complete');
  }

  async onConvertError(opts={}, error) {
    console.log('convert error', error);

    await this.cleanup(opts.id);

    let data = Object.assign({}, opts);
    delete data.jwt;

    data.error = {
      message: error.message,
      stack : error.stack
    }
    try {
      let jsonld = {
        "http://schema.org/status": [{
          "@value": "error"
        }],
        "http://fin.library.ucdavis.edu/workflowData": [{
          "@value" : JSON.stringify(data),
        }],
        "http://schema.org/url": [{
          "@id": opts.host+'/svc:'+opts.svcId+opts.id
        }]
      }
      pubsub.sendMessage('update', jsonld, opts.id);
      // await ldp.update(opts.host, opts.jwt, opts.id, data, 'error', opts.svcId);
    } catch(e) {
      console.log(e);
    }
  }

  async cleanup(id) {
    id = id.replace(/\/.workflow\//, '').replace(/\//g, '-');
    let workspaceDir = path.join(config.videoService.localStorage.workspace, id);
    if( fs.existsSync(workspaceDir) ) {
      await fs.remove(workspaceDir);
    }
  }

  async delete(opts={}) {
    let {host, id} = opts;
    let {hostname} = this.getHost(host);

    await storage.deleteFolder({hostname, pairTreeId: id});
    pubsub.sendMessage('delete', null, opts.id);
    // await ldp.delete(host, jwt, id);
  }

  download(opts={}) {
    let {host, id} = opts;
    ({host} = this.getHost(host));

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