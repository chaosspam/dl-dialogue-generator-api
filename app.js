const DragaliaCanvas = require('./canvas.js');
const FuzzyMatching = require('fuzzy-matching');
const express = require('express');
const axios = require('axios');

const app = express();
const canvas = new DragaliaCanvas();

const PORTRAIT_API = 'https://dlportraits.space/portrait_output/';

let portraitData = null;
let fm = null;

app.get('/', (req, res) => {
  res.type('text').status(200).send('test');
});

app.get('/:type/:name/:text/result.png', async (req, res) => {

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
      dialogueType: req.params.type,
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
        'offsetY': req.query.bgy ? parseFloat(req.query.bgy) : 155,
        'rotation': req.query.bgr ? parseFloat(req.query.bgr) : 0,
        'scale': req.query.bgs ? parseFloat(req.query.bgs) : 1,
        'opacity': req.query.bgo ? parseFloat(req.query.bgo) : 1,
        'flipX': req.query.bgflipx !== undefined
      });
    } else {
      properties.layers.push({
        'image': 'https://dragalialost.wiki/images/b/b4/Sty_bg_0024_100_00.png',
        'offsetX': req.query.bgx ? parseFloat(req.query.bgx) : 0,
        'offsetY': req.query.bgy ? parseFloat(req.query.bgy) : 155,
        'rotation': req.query.bgr ? parseFloat(req.query.bgr) : 0,
        'scale': req.query.bgs ? parseFloat(req.query.bgs) : 1,
        'opacity': req.query.bgo ? parseFloat(req.query.bgo) : 1,
        'flipX': req.query.bgflipx !== undefined
      });
    }
  }

  properties.layers.push({
    'image': req.query.src ? req.query.src : `${PORTRAIT_API}${characterId}/${characterId}_base.png`,
    'offsetX': req.query.x ? parseFloat(req.query.x) : 0,
    'offsetY': req.query.y ? parseFloat(req.query.y) : 120,
    'rotation': req.query.r ? parseFloat(req.query.r) : 0,
    'scale': req.query.s ? parseFloat(req.query.s) : 1,
    'opacity': req.query.o ? parseFloat(req.query.o) : 1,
    'flipX': req.query.flipx !== undefined
  });

  const buffer = await canvas.drawDialogueScreen(properties);

  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': buffer.length
  });
  res.end(buffer);

});

function validateFont(font) {
  return ['en', 'ja', 'zh_tw', 'zh_cn'].includes(font) ? font : 'en';
}

function validateEmotion(emotion) {
  return ['none', 'anger', 'bad', 'exclamation', 'heart', 'inspiration', 'note', 'notice', 'question', 'sleep', 'sweat'].includes(emotion);
}

async function setupLookup() {
  try {
    let response = await axios.get(PORTRAIT_API + 'localizedDirData.json');
    data = response.data.fileList;
    portraitData = {};
    for (let characterId in data) {
      portraitData[data[characterId].en_us] = characterId;
    }
    let keys = Object.keys(portraitData);
    fm = new FuzzyMatching(keys);
  } catch (error) {
    console.error(error);
  }
}

app.use(express.static('public'));
const PORT = process.env.PORT || 8000;
app.listen(PORT);