const Discord = require('discord.js');
const client = new Discord.Client();
const prefs = require('./settings.json');
const crypto = require('crypto');
const jimp = require('jimp');

function sendEmbeddedMessage(msg, text, image) {

    if(image !== undefined) {
        msg.channel.send({
            embed: {
                color: 8603131,
                author: {
                    name: client.user.username,
                    icon_url: client.user.avatarURL
                },
                image: {
                    url: image
                },
                fields: [{
                    name: "Message",
                    value: text
                }],
                footer: {
                    icon_url: msg.author.avatarURL,
                    text: "'"+msg.content.split(" ")[0].substring(prefs.prefix.length)+"' issued by "+msg.author.tag
                }
            }
        });
    }
    else {
        msg.channel.send({
            embed: {
                color: 8603131,
                author: {
                    name: client.user.username,
                    icon_url: client.user.avatarURL
                },
                fields: [{
                    name: "Error",
                    value: text
                }],
                footer: {
                    icon_url: msg.author.avatarURL,
                    text: "'"+msg.content.split(" ")[0].substring(prefs.prefix.length)+"' issued by "+msg.author.tag
                }
            }
        });
    }

    
}

function enoughArgs(min, args, msg) {
    if(args.length < min+1) {
        cmd = getCurrentCommand(msg);
        sendEmbeddedMessage(msg, ':x: Not enough arguments. Please type `'+prefs.prefix+"help "+cmd+" "+args[0]+"` for more info");
        return false;
    }
    return true;
}

function getCurrentCommand(msg) {
    return msg.content.split(" ")[0].substring(prefs.prefix.length);
}

function measureText(font, text) {
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

commands = {
    "ping": {
        description: "Shows the delay between the bot and Discord servers",
        summon: function(msg, args) {
            msg.channel.send({
                embed: {
                    color: 8603131,
                    author: {
                        name: client.user.username,
                        icon_url: client.user.avatarURL
                    },
                    fields: [{
                        name: "Server delay",
                        value: ":heartbeat: "+client.ping+" ms"
                    }],
                    footer: {
                        icon_url: msg.author.avatarURL,
                        text: "'"+msg.content.split(" ")[0].substring(prefs.prefix.length)+"' issued by "+msg.author.tag
                    }
                }
            });
        }
    },

    "imgedit": {
        description: "Image manipulation toolbox",
        subcommands: ["resize", "grey", "mirror", "rotate", "pride", "blur", "sepia", "poster","addtext"],
        summon: function(msg, args) {

            // No args
            if(args.length == 0 || !this.subcommands.includes(args[0])) {
                sendEmbeddedMessage(msg, ":x: Invalid arguments. Type `"+prefs.prefix+"help imgedit` for more info");
                return;
            }

            // No embeds
            if(msg.attachments.size == 0) {
                sendEmbeddedMessage(msg, ":x: You need to embed and comment an image to perform this command as shown on the image below", "https://pli.io/FGBbm.png")
                return;
            }

            // Used to send a modified image
            function sendImageAsBuffer(err, buf, text, mime, ext) {
                // Sending resized image
                msg.channel.send({
                    embed: {
                        color: 8603131,
                        author: {
                            name: client.user.username,
                            icon_url: client.user.avatarURL
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

            function writeArrayToImage(textArray, img, fontSize, mime, extension) {
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
                        if(measureText(font, lines[thisLine] +" "+ textArray[i]) < img.bitmap.width-img.bitmap.width*0.06) {
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
                                sendEmbeddedMessage(msg, ":x: Text won't fit. Please consider using a bigger image or smaller words");
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
                        sendImageAsBuffer(err, buf, ":white_check_mark: Text added on image", mime, extension);
                    });
                });
            }
            
            // Preparing image
            jimp.read(msg.attachments.first().url).then(function(img) {

                // Getting image info
                extension = msg.attachments.first().filename.split(".")[msg.attachments.first().filename.split(".").length-1];
                mime = jimp.MIME_JPEG;
                if(extension === "png") {
                    mime = jimp.MIME_PNG;
                }
                else if(extension === "bmp") {
                    mime = jimp.MIME_BMP;
                }
                
                // Image edition
                if(args[0] === "resize") {
                    if(enoughArgs(2, args, msg)) {

                        width = parseInt(args[1]);
                        height = parseInt(args[2]);

                        if(width>5000 || height>5000) {
                            sendEmbeddedMessage(msg, ":x: Width and height are limited to 5000 pixels to spare some bandwidth");
                            return;
                        }

                        img = img.resize(parseInt(args[1]), parseInt(args[2]));
                        img.getBuffer(mime, (err, buf) => { sendImageAsBuffer(err, buf, ":white_check_mark: Your image has been resized to "+parseInt(args[1])+"x"+parseInt(args[2])+" pixels.") }, mime, extension);
                    }
                }
                else if(args[0] === "grey") {
                    img = img.greyscale();
                    img.getBuffer(mime, (err, buf) => { sendImageAsBuffer(err, buf, ":white_check_mark: Your image has been greyed out.") }, mime, extension);
                }
                else if(args[0] === "mirror") {
                    if(enoughArgs(1, args, msg)) {
                        isHorizontal = args[1] === "h"
                        img = img.flip(isHorizontal, !isHorizontal);
                        img.getBuffer(mime, (err, buf) => { sendImageAsBuffer(err, buf, ":white_check_mark Image flipped"+ isHorizontal?"horizontally":"vertically") }, mime, extension);
                    }
                }
                else if(args[0] === "rotate") {
                    if(enoughArgs(1, args, msg)) {
                        deg = parseInt(args[1])
                        img = img.rotate(deg);
                        img = img.background(0x00000000, (err, newimg) => { 
                            mime = jimp.MIME_PNG;
                            extension = "png";
                            newimg.getBuffer(jimp.MIME_PNG, (err, buf) => { sendImageAsBuffer(err, buf, ":white_check_mark: Image rotated by "+deg+" degrees") }, mime, extension);
                        })
                    }
                }
                else if(args[0] === "pride") {
                    jimp.read('mask/pride.png', (err, masked) => {
                        masked.resize(img.bitmap.width, img.bitmap.height);
                        masked.opacity(0.3, (err, fadedMask) => {
                            img.composite(fadedMask, 0, 0, (err, finalImg) => {
                                finalImg.getBuffer(mime, (err, buf) => { sendImageAsBuffer(err, buf, ":white_check_mark: Image has been gayed out", mime, extension) });
                            });
                        })
                    });
                }
                else if(args[0] === "blur") {
                    if(enoughArgs(1, args, msg)) {
                        pixels = parseInt(args[1]);
                        img = img.blur(pixels>100?100:pixels);
                        img.getBuffer(mime, (err, buf) => { sendImageAsBuffer(err, buf, ":white_check_mark: Image has been blurred by "+ (pixels>100?100:pixels) +" pixels",mime, extension) });
                    }
                }
                else if(args[0] === "sepia") {
                    img.sepia((err, sepiad) => {
                        sepiad.getBuffer(mime, (err, buf) => { sendImageAsBuffer(err, buf, ":white_check_mark: Image has been aged out", mime, extension) });
                    });
                }
                else if(args[0] === "poster") {
                    if (enoughArgs(1, args, msg)) {
                        level = parseInt(args[1]);
                        img.posterize(level, (err, postered) => { 
                            postered.getBuffer(mime, (err, buf) => { 
                                sendImageAsBuffer(err, buf, ":white_check_mark: Image has been posterized (level "+level+")");
                             });
                         });
                    }
                }
                else if(args[0] === "addtext") {
                    if(enoughArgs(1, args, msg)) {
                        textArray = args.slice(1);
                        img = writeArrayToImage(textArray, img, 128, mime, extension);
                    }
                }

            }).catch(function (err) {
                sendEmbeddedMessage(msg, ":x: An error has occured.\n\r`"+err+"`");
            });
        }
    }
}

function isCleanMessage(msg) {
    if(msg.author.bot || msg.content.split(" ")[0].length<=prefs.prefix.length)
        return false;
    return true;   
}

function processCommand(msg) {
    if(!isCleanMessage(msg))
        return;
    
    command = msg.content.split(" ")[0].substring(prefs.prefix.length);
    args = msg.content.split(" ");
    args.splice(0,1);

    if(command == "help") {
        // General help
        if(args.length === 0) {

            description = "**Command List**\n\r"
            propCount = Object.keys(commands).length;
            printedProps = 1;
            for(var prop in commands) {
                description += "**`"+prefs.prefix+prop+"`** - ***"+commands[prop].description+(printedProps<propCount?"***\n\r":"***");
                printedProps++;
            }

            helpJson = {
                "color": 8603131,
                "author": {
                    "name": client.user.username,
                    "icon_url": client.user.avatarURL
                },
                "description": description,
                "fields": [
                    {
                        "name": "Tip :",
                        "value": "Type **`"+prefs.prefix+"help <command>`** to learn how to use a specific command",
                        "inline": true
                    },
                ],
                "footer": {
                    "icon_url": msg.author.avatarURL,
                    "text": "'"+msg.content.split(" ")[0].substring(prefs.prefix.length)+"' issued by "+msg.author.tag
                }
            }

            msg.channel.send({
                embed: helpJson
            });
        }
        // Subcommands help
        else {
            msg.channel.send({
                embed: {
                color: 8603131,
                author: {
                    name: client.user.username,
                    icon_url: client.user.avatarURL
                },
                fields: [
                    {
                        name: "Error",
                        value: ":x: Work in progress",
                    },
                ],
                "footer": {
                    "icon_url": msg.author.avatarURL,
                    "text": "'"+msg.content.split(" ")[0].substring(prefs.prefix.length)+"' issued by "+msg.author.tag
                }
                }
            });
        }
        return;
    }
    // If malformed or invalid command
    else if(commands[command] == null) {
        sendEmbeddedMessage(msg, ":no_entry: Invalid command. Type `"+prefs.prefix+"help` for a list of available commands")
        return;
    }

    commands[command].summon(msg, args);
}

client.on('ready', () => {
    var id = crypto.randomBytes(10).toString('hex');
    console.log(`Logged in as ${client.user.tag}, build id: #`+id);
    client.user.setPresence({game: {name: prefs.prefix+"help | Build #"+id}, status: 'online'});
});

client.on('message', msg => {
    if (msg.content.startsWith(prefs.prefix)) {
        processCommand(msg);
  }
});

client.login(prefs.token);