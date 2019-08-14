const discordUtil = require('./discord');
const prefs = require('../settings.json');

exports.measureText = function(font, text) {
    var x = 0;
    for (var i = 0; i < text.length; i++) {
        if (font.chars[text[i]]) {
            x += font.chars[text[i]].xoffset
              + (font.kernings[text[i]] && font.kernings[text[i]][text[i+1]] ? font.kernings[text[i]][text[i+1]] : 0)
              + (font.chars[text[i]].xadvance || 0);
        }
    }
    return x;
};

exports.sendImageAsBuffer = function(err, buf, text, mime, ext) {
    // Sending resized image
    msg.channel.send({
        embed: {
            color: 8603131,
            author: {
                name: discordUtil.getClient().user.username,
                icon_url: discordUtil.getClient().user.avatarURL
            },
            fields: [{
                name: "Success !",
                value: text
            }],
            footer: {
                icon_url: msg.author.avatarURL,
                text: "'"+msg.content.split(" ")[0].substring(prefs.prefix.length)+"' issued by "+msg.author.tag
            }
        },
        files: [{
            attachment: buf,
            name: 'image.'+extension
        }]
    });
}

// Used to send a modified image
exports.writeArrayToImage = function(textArray, img, fontSize, mime, extension) {
    availableSizes = [8, 10, 12, 14, 16, 32, 64, 128];
    heightForSizes = [6, 7, 8, 9, 10, 20, 35, 52]
    jimp.loadFont("font/upheaval"+fontSize+".fnt", (err, font) => {
        // Preparing text lines
        thisLine = 0;
        lines = [];
        first = true;
        for(var i=0; i<textArray.length; i++) {
            if(lines[thisLine] === undefined) {
                lines[thisLine] = "";
                first = true;
            }
            else {
                first = false;
            }
            if(img.measureText(font, lines[thisLine] +" "+ textArray[i]) < img.bitmap.width-img.bitmap.width*0.06) {
                lines[thisLine]+=first?textArray[i]:" "+textArray[i];
            }
            else if(!first) {
                if(availableSizes.indexOf(fontSize) > 0 && lines[thisLine] !== undefined && lines[thisLine].split(' ').length<3) {
                    return writeArrayToImage(textArray, img, availableSizes[availableSizes.indexOf(fontSize)-1], mime, extension);
                }
                thisLine++;
                i--;
            }
            else {
                if(availableSizes.indexOf(fontSize) === 0) {
                    discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Text won't fit. Please consider using a bigger image or smaller words");
                    return;
                }
                else {
                    return writeArrayToImage(textArray, img, availableSizes[availableSizes.indexOf(fontSize)-1], mime, extension);
                }
            }
        }
        // Printing text on image
        for(var i=0; i<lines.length; i++) {
            img.print(font, img.bitmap.width*0.03, (i*heightForSizes[availableSizes.indexOf(fontSize)])+(i*3), lines[i]);
        }

        // Sending image
        img.getBuffer(mime, (err, buf) => {
            img.sendImageAsBuffer(err, buf, ":white_check_mark: Text added on image", mime, extension);
        });
    });
}