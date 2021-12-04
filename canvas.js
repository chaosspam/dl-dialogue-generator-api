const fs = require('fs');
const fsPromises = fs.promises;
const { createCanvas, loadImage, registerFont } = require('canvas');
registerFont('./fonts/dragalialosten.ttf', { family: 'dragalialost_en' });
registerFont('./fonts/dragalialostjp.otf', { family: 'dragalialost_ja' });
registerFont('./fonts/dragalialostzh_cn.ttf', { family: 'dragalialost_zh_cn' });
registerFont('./fonts/dragalialostzh_tw.ttf', { family: 'dragalialost_zh_tw' });

const i18n = JSON.parse(fs.readFileSync('./data/i18n.json', 'utf-8'));

const width = 750;
const height = 1334;

const furiganaSize = 15;
const emotionFromSide = 180;
const emotionYPos = 250;
const textures = {};

class DragaliaCanvas {
  /**
   * Draws the dialogue screen based on inputs
   */
  async drawDialogueScreen(properties) {
    try {
      // Get canvas context
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Get draw type
      const dialogueType = properties.settings.dialogueType;
      const lang = properties.settings.font;

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let bar = await this.loadTexture('bar');

      if (dialogueType === 'intro') {
        bar = await this.loadTexture('introBar');
        ctx.drawImage(await this.loadTexture('introBack'), 0, 0);
      }
      if (dialogueType === 'caption' || dialogueType === 'narration') {
        bar = await this.loadTexture('caption');
      }
      if (dialogueType === 'full') {
        bar = await this.loadTexture('fullscreen');
      }
      if (dialogueType === 'book') {
        ctx.drawImage(await this.loadTexture('book'), 0, 0);
        bar = await this.loadTexture('skip_' + lang);
      }

      // Draw Layers
      for (let i = 0; i < properties.layers.length; i++) {
        let layer = properties.layers[i];
        let image = await loadImage(layer.image);
        this.drawImageWithData(ctx, image, canvas.width / 2, canvas.height / 2, layer, dialogueType === 'intro')
      }

      await this.drawEmotion(ctx, properties);

      ctx.drawImage(bar, 0, 0);
      // If language is not English, we draw the skip button in other language
      if (lang !== 'en') {
        ctx.drawImage(await this.loadTexture('skip_' + lang), 0, 0);
      }

      // Wait for font load
      this.drawDialogueText(dialogueType, ctx, lang, properties);

      // Save to buffer
      return Buffer.from(canvas.toBuffer('image/png'), 'binary');

    } catch (error) {
      console.error(error);
    }
  }

  async loadTexture(key) {
    if (!textures[key]) {
      try {
        textures[key] = await loadImage(`images/${key}.png`);
      } catch (error) {
        console.error(error);
        return null;
      }
    }
    return textures[key];
  }

  /**
   * Draws the image with given data
   * @param {CanvasRenderingContext2D} ctx - Context of the canvas to draw on
   * @param {number} centerX - Where to center the image's x position at
   * @param {number} centerY - Where to center the image y position at
   * @param {Object} layer - Data of the image
   */
  drawImageWithData(ctx, image, centerX, centerY, layer, dropShadow = false) {
    // Sanitize the data passed in
    centerX = parseFloat(centerX);
    centerY = parseFloat(centerY);
    let scale = parseFloat(layer.scale);
    let offsetX = parseFloat(layer.offsetX);
    let offsetY = -parseFloat(layer.offsetY);
    let rotation = parseFloat(layer.rotation ? layer.rotation : 0);

    let width = image.naturalWidth * scale;
    let height = image.naturalHeight * scale;

    let x = centerX - width / 2 + offsetX;
    let y = centerY - height / 2 + offsetY;

    // Save current context state
    ctx.save();

    // Move the context to the pivot before rotating
    ctx.translate(centerX + offsetX, centerY + offsetY);

    if (layer.flipX) {
      ctx.scale(-1, 1);
    }

    if (rotation !== 0) {
      ctx.rotate(rotation * Math.PI / 180);
    }

    if (dropShadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, .25)';
      ctx.shadowOffsetX = 20;
      ctx.shadowOffsetY = 20;
    }

    ctx.globalAlpha = layer.opacity;

    ctx.translate(-centerX - offsetX, -centerY - offsetY);

    ctx.drawImage(image, x, y, width, height);

    // Restore original state
    ctx.restore();
  }

  /**
   * Draws the emotion balloon using context from canvas to draw on
   * @param {CanvasRenderingContext2D} ctx - Context of the canvas to draw on
   */
  async drawEmotion(ctx, properties) {
    const { settings } = properties

    let emotionName = settings.emotion;
    if (emotionName !== 'none') {
      let emotionSide = settings.emotionSide;
      emotionName += '_' + emotionSide;
      const emotion = await this.loadTexture(emotionName);
      this.drawImageWithData(ctx, emotion,
        emotionSide === 'l' ? emotionFromSide : ctx.canvas.width - emotionFromSide,
        emotionYPos,
        {
          'offsetX': settings.emotionOffsetX,
          'offsetY': settings.emotionOffsetY,
          'scale': 1
        });
    }
  }

  /**
   * Draws the dialogue text using context from canvas to draw on
   * @param {CanvasRenderingContext2D} ctx - Context of the canvas to draw on
   * @param {string} lang - language of the font to draw with
   */
  drawDialogueText(dialogueType, ctx, lang, properties) {
    // Get text property and text to draw
    const textProp = i18n[lang].textProperties;
    const speakerName = properties.settings.speaker;
    const dialogue = properties.settings.dialogueText;

    // Draw speaker name
    ctx.textAlign = 'left';

    ctx.font = `${textProp.nameSize}px dragalialost_${lang}`;
    ctx.fillStyle = 'white';

    if (dialogueType === 'caption') {
      ctx.font = `${textProp.titleSize}px dragalialost_${lang}`;
      ctx.fillText(speakerName, (ctx.canvas.width - ctx.measureText(speakerName).width) / 2, textProp.titleYPos);
      ctx.fillRect(0, 430, ctx.canvas.width, 1);
    } else if (dialogueType === 'intro') {
      this.drawSpeakerNameIntro(ctx, textProp, lang, speakerName);
    } else if (dialogueType !== 'narration' && dialogueType !== 'full' && dialogueType !== 'book') {
      ctx.fillText(speakerName, textProp.speakerXPos, textProp.speakerYPos);
    }

    // Draw dialogue
    let lines = dialogue.split('\n');

    let fontSize = textProp.dialogueSize;
    let lineHeight = textProp.lineHeight;

    let startX = textProp.dialogueXPos;
    let startY = textProp.dialogueYPos;

    ctx.fillStyle = '#071726';

    if (dialogueType === 'intro') {
      this.drawTitleIntro(ctx, textProp, lang, dialogue);
      return;
    }

    let center = false;

    if (dialogueType === 'caption') {
      startY = textProp.captionYPos;
      ctx.fillStyle = 'white';
      fontSize = textProp.captionSize;
      center = true;
    } else if (dialogueType === 'narration' || dialogueType === 'full') {
      fontSize = textProp.dialogueSize;
      lineHeight = textProp.narrationLineHeight;
      startY = textProp.narrationYPos - (fontSize + (lines.length - 1) * lineHeight) / 2;
      ctx.fillStyle = 'white';
      center = true;
    } else if (dialogueType === 'book') {
      fontSize = textProp.dialogueSize;
      lineHeight = textProp.narrationLineHeight;
      startY = ctx.canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
      ctx.fillStyle = '#412c29';
      center = true;
    }

    ctx.font = `${fontSize}px dragalialost_${lang}`;

    // Draw line by line
    for (let i = 0; i < lines.length; i++) {
      let x = startX;
      if (center) {
        let base = lines[i].replace(/\(([^)]+)\)\{([^}]+)\}/g, (match, base, furigana, offset, string) => base);
        x = (ctx.canvas.width - ctx.measureText(base).width) / 2;
      }
      let y = startY + i * lineHeight;
      this.drawDialogueLine(ctx, lang, lines[i], fontSize, x, y);
    }
  }

  /**
   * Draws a line of text starting at the provided position
   * @param {CanvasRenderingContext2D} ctx - Context of the canvas to draw on
   * @param {string} lang - Language of the font to draw with
   * @param {string} text - Text to draw
   * @param {number} fontSize - Default size of the dialogue text in provided language
   * @param {number} startX - Starting x position to draw text from
   * @param {number} startY - Starting y position to draw text from
   */
  drawDialogueLine(ctx, lang, text, fontSize, startX, startY) {
    let tmp = '';
    let last = 0;
    const normalFont = `${fontSize}px dragalialost_${lang}`;
    const furiganaFont = `${furiganaSize}px dragalialost_${lang}`;

    // Draw the furigana first by removing them from the line
    text = text.replace(/\(([^)]+)\)\{([^}]+)\}/g, (match, base, furigana, offset, string) => {
      tmp += text.substring(last, offset);

      // Use normal font size first
      ctx.font = normalFont;
      // Measure the length so far, add the half of the text below the furigana for the center
      let center = startX + ctx.measureText(tmp).width + ctx.measureText(base).width / 2;

      // Change to smaller font, measure where to start the furigana
      ctx.font = furiganaFont;
      let furiganaX = center - ctx.measureText(furigana).width / 2;
      let furiganaY = startY - fontSize + 2;
      ctx.fillText(furigana, furiganaX, furiganaY);

      tmp += base;
      last = offset + base.length + furigana.length + 4;

      return base;
    });

    // Draw text without furigana
    ctx.font = normalFont;
    ctx.fillText(text, startX, startY);
  }

  /**
   * Draws the speaker's name slanted for intro
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} textProp - property of the text
   * @param {string} lang - Language of the font to draw with
   * @param {string} speakerName - Text to draw
   */
  drawSpeakerNameIntro(ctx, textProp, lang, speakerName) {
    ctx.save();

    ctx.font = `${textProp.introNameSize}px dragalialost_${lang}`;
    let textWidth = ctx.measureText(speakerName).width;

    let x = ctx.canvas.width;
    ctx.translate(x, textProp.introNameYPos);
    ctx.rotate(-6.25 * Math.PI / 180);
    ctx.translate(-x, -textProp.introNameYPos);

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 8;
    ctx.miterLimit = 2;
    ctx.strokeText(speakerName, ctx.canvas.width - textWidth - textProp.introXPos, textProp.introNameYPos);
    ctx.fillText(speakerName, ctx.canvas.width - textWidth - textProp.introXPos, textProp.introNameYPos);

    ctx.restore();
  }

  /**
   * Draws the speaker's name slanted for intro
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} textProp - property of the text
   * @param {string} lang - Language of the font to draw with
   * @param {string} speakerName - Text to draw
   */
  drawTitleIntro(ctx, textProp, lang, text) {
    ctx.save();

    ctx.font = `${textProp.introTitleSize}px dragalialost_${lang}`;
    let textWidth = ctx.measureText(text).width;

    let x = ctx.canvas.width;
    ctx.translate(x, textProp.introTitleYPos);
    ctx.rotate(-6.25 * Math.PI / 180);
    ctx.translate(-x, -textProp.introTitleYPos);

    ctx.fillStyle = '#333333';
    ctx.fillText(text, ctx.canvas.width - textWidth - textProp.introXPos, textProp.introTitleYPos);

    ctx.restore();
  }
}

module.exports = DragaliaCanvas;