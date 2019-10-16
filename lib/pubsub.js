const {config, logger} = require('@ucd-lib/fin-node-utils');
const {PubSub} = require('@google-cloud/pubsub');
const {URL} = require('url');
const fs = require('fs');

class FinGCWorflowPubSub {

  constructor() {
    this.TOPIC_NAME = 'fin-workflow-'+config.workflow.name;
    this.init();
  }

  async init() {
    let opts = {};
    if( fs.existsSync('/etc/fin/service-account.json') ) {
      opts.projectId = require('/etc/fin/service-account.json').project_id,
      opts.keyFilename = '/etc/fin/service-account.json'
    }

    this.pubsub = new PubSub(opts);
    await this.initTopic();
  }

  async initTopic() {
    if( this.topic ) return;

    let topicId = `projects/${this.pubsub.projectId}/topics/${this.TOPIC_NAME}`;

    let topics = (await this.pubsub.getTopics({autoPaginate: false}))[0];
    this.topic = topics.find(topic => topic.name === topicId);
    if( !this.topic ) {
      try {
        let resp = await this.pubsub.createTopic(this.TOPIC_NAME);
        this.topic = resp[0];
      } catch(e) {
        return;
      }
    }
    logger.info('topic initialized', this.topic.name);
  }

  async sendMessage(action='', jsonld={}, id='') {
    await this.initTopic();
    let msg = JSON.stringify({action, jsonld, id});
    return this.topic.publish(Buffer.from(msg));
  }

}

module.exports = new FinGCWorflowPubSub();