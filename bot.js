const Discord = require('discord.js');
const client = new Discord.Client();
prefs = require('./settings.json');

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
        summon: function(msg, args) {

        }
    }
}

function isCleanMessage(msg) {
    if(msg.author.bot || msg.content.length<=prefs.prefix.length)
        return false;
    return true;   
}

function processCommand(msg) {
    if(!isCleanMessage(msg))
        return;
    
    command = msg.content.split(" ")[0].substring(prefs.prefix.length);
    args = msg.content.substring(command.length+prefs.prefix.length+1);

    commands[command].summon(msg, args);
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content.startsWith(prefs.prefix)) {
      processCommand(msg);
  }
});

client.login(prefs.token);