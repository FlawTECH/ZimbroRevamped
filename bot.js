const Discord = require('discord.js');
const client = new Discord.Client();
const prefs = require('./settings.json');
const crypto = require('crypto');
const jimp = require('jimp');
const stream = require('stream');

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
        subcommands: ["resize", "crop", "grayscale"],
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
            function sendImageAsBuffer(err, buf) {
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
                            value: ":white_check_mark: Your image has been resized to "+parseInt(args[1])+"x"+parseInt(args[2])+" pixels."
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
            
            // Preparing image
            jimp.read(msg.attachments.first().url).then(function(img) {

                // Getting image info
                extension = msg.attachments.first().filename.split(".")[msg.attachments.first().filename.split(".").length-1];
                var mime = jimp.MIME_JPEG;
                if(extension === "png") {
                    mime = jimp.MIME_PNG;
                }
                else if(extension === "bmp") {
                    mime = jimp.MIME_BMP;
                }
                
                // Image edition
                if(args[0] === "resize") {
                    width = parseInt(args[1]);
                    height = parseInt(args[2]);

                    if(width>5000 || height>5000) {
                        sendEmbeddedMessage(msg, ":x: Width and height are limited to 5000 pixels to spare some bandwidth");
                        return;
                    }

                    img = img.resize(parseInt(args[1]), parseInt(args[2]));
                    img.getBuffer(mime, sendImageAsBuffer);
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

    // If malformed or invalid command
    if(commands[command] == null) {
        sendEmbeddedMessage(msg, ":no_entry: Invalid command. Type `"+prefs.prefix+"help` for a list of available commands")
        return;
    }

    commands[command].summon(msg, args);
}

client.on('ready', () => {
    var id = crypto.randomBytes(10).toString('hex');
    console.log(`Logged in as ${client.user.tag}, build id: #`+id);
    client.user.setPresence({game: {name: "Build #"+id}, status: 'online'});
});

client.on('message', msg => {
    if (msg.content.startsWith(prefs.prefix)) {
        processCommand(msg);
  }
});

client.login(prefs.token);