const api = require('@ucd-lib/fin-node-api');
const config = require('./config');

class LdpWorkflow {

  /**
   * @method create
   * @description create a LDP Worflow container
   * 
   */
  async create(data={}, host, jwt, username) {
    let response = await api.head({host, jwt, path: config.workflow.root});
    if( response.checkStatus(404) ) {
      response = await api.postEnsureSlug({
        host, jwt,
        path : '/',
        slug: config.workflow.root.replace(/^\//, '')
      });
    }

    let jsonld = [{
      "@id" : '',
      "@type": [
        "http://fin.library.ucdavis.edu/Workflow"
      ],
      "http://fin.library.ucdavis.edu/workflowData": [{
        "@value" : JSON.stringify(data),
      }],
      "http://schema.org/description": [{
        "@value": "Video stream conversion service"
      }],
      "http://schema.org/status": [{
        "@value": "running"
      }],
      "http://schema.org/creator": [{
        "@value": username
      }]
    }]

    response = await api.post({
      host, jwt,
      path : config.workflow.root,
      headers : {
        'content-type': 'application/ld+json'
      },
      content : JSON.stringify(jsonld)
    });

    if( !response.checkStatus(201) ) {
      throw new Error(`Unable to create LDP workflow.  HTTP ${response.last.statusCode}: ${response.last.body}`);
    }

    let id = response.last.body.replace(/.*fcrepo\/rest/, '');
    return id;
  }

  async update(host, jwt, id, data, status) {
    let response = await api.get({
      host, jwt,
      path: id,
      headers : {
        accept : 'application/ld+json',
        prefer : 'return=minimal'
      }
    });
    if( !response.checkStatus(200) ) {
      throw new Error(`Unable to load LDP workflow ${id}.  HTTP ${response.last.statusCode}: ${response.last.body}`);
    }
    let jsonld = JSON.parse(response.last.body)[0];

    jsonld['@id'] = '';
    jsonld = Object.assign(jsonld, {
      "http://schema.org/status": [{
        "@value": (status || "complete")
      }],
      "http://schema.org/url": [{
        "@id": host+'/svc:video-converter'+id
      }]
    });
    if( data ) {
      jsonld = Object.assign(jsonld, {
        "http://fin.library.ucdavis.edu/workflowData": [{
          "@value" : JSON.stringify(data),
        }]
      });
    }
  
    response = await api.put({
      host, jwt,
      path: id,
      headers : {
        'content-type': 'application/ld+json',
        'prefer' : 'handling=lenient; received="minimal"'
      },
      content : JSON.stringify(jsonld)
    });
    if( !response.checkStatus(204) ) {
      throw new Error(`Unable to update LDP workflow ${id}.  HTTP ${response.last.statusCode}: ${response.last.body}`);
    }
  }

  async delete(host, jwt, id) {
    return api.delete({
      host, jwt,
      path: id,
      permanent: true
    })
  }

}

module.exports = new LdpWorkflow();