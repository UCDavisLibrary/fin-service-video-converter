const express = require('express');
const {jwt} = require('@ucd-lib/fin-node-utils');
const app = express();
const model = require('./lib/model');
const bodyParser = require('body-parser');

function auth(req, res, next) {
  console.log('auth');

  let token = req.get('authorization') || req.get('X-FIN-SERVICE-SIGNATURE') || req.query.token;
  if( token ) token = token.replace(/^Bearer /i, '');

  req.token = token;
  token = jwt.validate(token);

  if( !token ) {
    return res.status(403).send('Invalid JWT');
  } else if( !token.admin ) {
    return res.status(403).send('Invalid Permissions');
  }

  req.user = token;
  next();
}

function handleError(res, error, id) {
  res.status(400).json({
    id,
    error: true,
    message: error.message,
    stack: error.stack
  });
}

app.use(bodyParser.json());

app.post('/', auth, async (req, res) => {
  console.log('post');
  let email = req.query.email || '';
  let host = req.query.host || '';
  let svcId = req.query.svcId || '';
  let workflowId = req.query.workflowId || '';
  let token = req.token;
  let id;

  console.log({
    body: req.body,
    email, host, svcId, workflowId,
    jwt: token,
    username : req.user.username,
  });

  try {
    id = await model.convert({
      gcsFile: req.body.file,
      email, host, svcId, workflowId,
      jwt: token,
      username : req.user.username,
    });
    res.send(workflowId);
  } catch(e) {
    handleError(res, e, id);
  }
});

app.delete(/^\/.*/, auth, async (req, res) => {
  let fcPath = req.query.fcPath || '';
  let host = req.query.host || '';
  let token = req.token;
  let id = req.path.replace(/\/fcr:metadata.*/, '');

  try {
    await model.delete({
      fcPath, host,
      jwt: token,
      id
    });
    res.status(204).send();
  } catch(e) {
    handleError(res, e,id);
  }
});

app.get(/^\/.*/, auth, async (req, res) => {
  console.log('get')
  let fcPath = req.query.fcPath || '';
  let host = req.query.host || '';
  let id = req.path.replace(/\/fcr:metadata.*/, '');

  try {
    let url = await model.download({
      fcPath, host,
      id
    });
    res.redirect(url);
  } catch(e) {
    handleError(res, e, id);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('fin-service-video-converter listening on port', port);
});