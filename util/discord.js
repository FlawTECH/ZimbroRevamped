const Discord = require('discord.js');
const prefs = require('../settings.json');


var client = null;

exports.sendSimpleMessage = function(msg, text, image=null) {
    if(image) {
        msg.channel.send({
            files: [
                {
                    attachment: image,
                    name: 'file.jpg'
                }

            ],
            text: text
        })
    }
    else {
        msg.channel.send(text);
    }
}

exports.sendEmbeddedMessage = function(msg, title, text, image) {

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
                    name: title,
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
                    name: title,
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

exports.getClient = function() {
    if(!client) {
        client = new Discord.Client();
    }
    return client;
}