const express = require('express');
const {jwt} = require('@ucd-lib/fin-node-utils');
const app = express();
const model = require('./lib/model');
const multer = require('multer');
const upload = multer({ dest: '/storage/uploads' });

function auth(req, res, next) {
  let token = req.get('X-FIN-SERVICE-SIGNATURE') || req.get('authorization') || req.query.token;
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

app.post('/', auth, upload.single('file'), async (req, res) => {
  let email = req.query.email || '';
  let fcUrl = req.query.fcUrl || '';
  let token = req.token;
  let id;

  try {
    id = await model.convert({
      filename: req.file.originalname,
      filepath: req.file.path,
      email, fcUrl, 
      jwt: token,
      username : req.user.username
    });
    res.send(id);
  } catch(e) {
    handleError(res, e, id);
  }
});

app.delete(/^\/.*/, auth, async (req, res) => {
  let fcUrl = req.query.fcUrl || '';
  let token = req.token;
  let id = req.path.replace(/\/fcr:metadata.*/, '');

  try {
    await model.delete({
      file: req.file.filename, fcUrl,
      jwt: token,
      id
    });
    res.status(204).send();
  } catch(e) {
    handleError(res, e,id);
  }
});

app.get(/^\/.*/, auth, async (req, res) => {
  let fcUrl = req.query.fcUrl || '';
  let id = req.path.replace(/\/fcr:metadata.*/, '');

  try {
    let url = await model.download({
      fcUrl,
      id
    });
    res.redirect(url);
  } catch(e) {
    handleError(res, e, id);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Hello world listening on port', port);
});