const DragaliaCanvas = require('./canvas.js');
const FuzzyMatching = require('fuzzy-matching');
const express = require('express');
const path = require('path');
const axios = require('axios');
const nacl = require('tweetnacl');
const bodyParser = require('body-parser');

// Your public key can be found on your application in the Developer Portal
const PUBLIC_KEY = "154";

const app = express();
const canvas = new DragaliaCanvas();

const PORTRAIT_API = 'https://dlportraits.space/portrait_output/';

let portraitData = null;
let fm = null;

app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}));

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '/index.html'));
});

app.get('/:type/:name/:text', async (req, res) => {

  if (!fm) {
    await setupLookup();
  }

  let userInput = req.query.id ? req.query.id : req.params.name;
  let approximated = fm.get(userInput).value;
  let characterId = approximated ? portraitData[approximated] : '100001_01';

  const properties = {
    layers: [],
    settings: {
      speaker: req.params.name,
      dialogueText: req.params.text,
      dialogueType: validateType(req.params.type),
      font: req.query.f ? validateFont(req.query.f) : 'en',
      emotion: req.query.e ? validateEmotion(req.query.e) : 'none',
      emotionSide: req.query.es ? (req.query.es === 'r' ? 'r' : 'l') : 'l',
      emotionOffsetX: req.query.ex ? parseFloat(req.query.ex) : 0,
      emotionOffsetY: req.query.ey ? parseFloat(req.query.ey) : 0
    }
  };

  if (req.query.nobg === undefined) {
    if(req.query.bg) {
      properties.layers.push({
        'image': req.query.bg,
        'offsetX': req.query.bgx ? parseFloat(req.query.bgx) : 0,
        'offsetY': req.query.bgy ? parseFloat(req.query.bgy) + 155 : 155,
        'rotation': req.query.bgr ? parseFloat(req.query.bgr) : 0,
        'scale': req.query.bgs ? parseFloat(req.query.bgs) : 1,
        'opacity': req.query.bgo ? parseFloat(req.query.bgo) : 1,
        'flipX': req.query.bgflipx !== undefined
      });
    } else {
      properties.layers.push({
        'image': 'https://dragalialost.wiki/images/b/b4/Sty_bg_0024_100_00.png',
        'offsetX': req.query.bgx ? parseFloat(req.query.bgx) : 0,
        'offsetY': req.query.bgy ? parseFloat(req.query.bgy) + 155 : 155,
        'rotation': req.query.bgr ? parseFloat(req.query.bgr) : 0,
        'scale': req.query.bgs ? parseFloat(req.query.bgs) : 1,
        'opacity': req.query.bgo ? parseFloat(req.query.bgo) : 1,
        'flipX': req.query.bgflipx !== undefined
      });
    }
  }

  if (req.query.noportrait === undefined) {
    properties.layers.push({
      'image': req.query.pt ? req.query.pt : `${PORTRAIT_API}${characterId}/${characterId}_base.png`,
      'offsetX': req.query.x ? parseFloat(req.query.x) : 0,
      'offsetY': req.query.y ? parseFloat(req.query.y) + 120 : 120,
      'rotation': req.query.r ? parseFloat(req.query.r) : 0,
      'scale': req.query.s ? parseFloat(req.query.s) : 1,
      'opacity': req.query.o ? parseFloat(req.query.o) : 1,
      'flipX': req.query.flipx !== undefined
    });
  }

  const buffer = await canvas.drawDialogueScreen(properties);


  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': buffer.length
  });
  res.end(buffer);

});

app.get('/:name/:text', async (req, res) => {

  if (!fm) {
    await setupLookup();
  }

  let userInput = req.query.id ? req.query.id : req.params.name;
  let approximated = fm.get(userInput).value;
  let characterId = approximated ? portraitData[approximated] : '100001_01';

  const properties = {
    layers: [],
    settings: {
      speaker: req.params.name,
      dialogueText: req.params.text,
      dialogueType: 'dialogue',
      font: req.query.f ? validateFont(req.query.f) : 'en',
      emotion: req.query.e ? validateEmotion(req.query.e) : 'none',
      emotionSide: req.query.es ? (req.query.es === 'r' ? 'r' : 'l') : 'l',
      emotionOffsetX: req.query.ex ? parseFloat(req.query.ex) : 0,
      emotionOffsetY: req.query.ey ? parseFloat(req.query.ey) : 0
    }
  };

  if (req.query.nobg === undefined) {
    if(req.query.bg) {
      properties.layers.push({
        'image': req.query.bg,
        'offsetX': req.query.bgx ? parseFloat(req.query.bgx) : 0,
        'offsetY': req.query.bgy ? parseFloat(req.query.bgy) + 155 : 155,
        'rotation': req.query.bgr ? parseFloat(req.query.bgr) : 0,
        'scale': req.query.bgs ? parseFloat(req.query.bgs) : 1,
        'opacity': req.query.bgo ? parseFloat(req.query.bgo) : 1,
        'flipX': req.query.bgflipx !== undefined
      });
    } else {
      properties.layers.push({
        'image': 'https://dragalialost.wiki/images/b/b4/Sty_bg_0024_100_00.png',
        'offsetX': req.query.bgx ? parseFloat(req.query.bgx) : 0,
        'offsetY': req.query.bgy ? parseFloat(req.query.bgy) + 155 : 155,
        'rotation': req.query.bgr ? parseFloat(req.query.bgr) : 0,
        'scale': req.query.bgs ? parseFloat(req.query.bgs) : 1,
        'opacity': req.query.bgo ? parseFloat(req.query.bgo) : 1,
        'flipX': req.query.bgflipx !== undefined
      });
    }
  }

  if (req.query.noportrait === undefined) {
    properties.layers.push({
      'image': req.query.pt ? req.query.pt : `${PORTRAIT_API}${characterId}/${characterId}_base.png`,
      'offsetX': req.query.x ? parseFloat(req.query.x) : 0,
      'offsetY': req.query.y ? parseFloat(req.query.y) + 120 : 120,
      'rotation': req.query.r ? parseFloat(req.query.r) : 0,
      'scale': req.query.s ? parseFloat(req.query.s) : 1,
      'opacity': req.query.o ? parseFloat(req.query.o) : 1,
      'flipX': req.query.flipx !== undefined
    });
  }

  const buffer = await canvas.drawDialogueScreen(properties);


  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': buffer.length
  });
  res.end(buffer);

});

function validateType(type) {
  return ['dialogue', 'intro', 'caption', 'full', 'narration', 'book'].includes(type) ? type : 'dialogue';
}

function validateFont(font) {
  return ['en', 'ja', 'zh_tw', 'zh_cn'].includes(font) ? font : 'en';
}

function validateEmotion(emotion) {
  return ['none', 'anger', 'bad', 'exclamation', 'heart', 'inspiration', 'note', 'notice', 'question', 'sleep', 'sweat'].includes(emotion) ? emotion : 'none';
}

async function setupLookup() {
  try {
    let response = await axios.get(PORTRAIT_API + 'localizedDirData.json');
    data = response.data.fileList;
    portraitData = {};
    for (let characterId in data) {
      portraitData[characterId] = characterId;
      portraitData[data[characterId].en_us] = characterId;
    }
    let keys = Object.keys(portraitData);
    fm = new FuzzyMatching(keys);
  } catch (error) {
    console.error(error);
  }
}

function verify(req) {
  if (!req.get('X-Signature-Ed25519') || !req.get('X-Signature-Timestamp')) {
    return false;
  }

  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');
  const body = req.rawBody; // rawBody is expected to be a string, not raw bytes

  return nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, 'hex'),
    Buffer.from(PUBLIC_KEY, 'hex')
  );
}

app.post('/discord', async (req, res) => {
  if (!verify(req)) {
    res.status(401).send();
    return;
  }
  const interaction = req.body;
  if (interaction.type == 1) { // ping
    res.json({'type': 1}); // pong
  }
  if (interaction.type == 2) { // APPLICATION_COMMAND
    const data = interaction.data;
    if (data.name == "dldialogue") {
      const name = data.options[0].value;
      const message = data.options[1].value;
      const nameEnc = encodeURI(name);
      const messageEnc = encodeURI(message);
      res.json({
        'type': 4,
        'data': {
          'content': "http://api.dldialogue.xyz/" + nameEnc + "/" + messageEnc
        }
      });
    }
  }
  res.status(404).send();
  return;
})

app.use(express.static('public'));
const PORT = process.env.PORT || 8000;
app.listen(PORT);
console.log(`Application started and listening on port ${PORT}`);
