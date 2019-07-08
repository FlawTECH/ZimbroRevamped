const Discord = require('discord.js');
const prefs = require('./settings.json');
const crypto = require('crypto');
const jimp = require('jimp');
const ytdl = require('ytdl-core');
const fs = require('fs');
const {google} = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const readline = require('readline');

const version = "19.07_07";
const client = new Discord.Client();
const songQueues = {};
var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];


function lengthFromSeconds(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor(seconds / 60) - hours * 60;
    var seconds = seconds - hours * 3600 - minutes * 60;

    return (hours>0?hours.toString().padStart(2, '0')+":":'')+minutes.toString().padStart(2, '0')+":"+seconds.toString().padStart(2, '0');
}

function sendEmbeddedMessage(msg, title, text, image) {

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

function embedYoutube(msg, video, isAddQueue, queuePos = 1, queueTime = 0) {

    if(isAddQueue) {
        msg.channel.send({
            embed: {
                title: video.player_response.videoDetails.title,
                url: "https://www.youtube.com/watch?v="+video.player_response.videoDetails.videoId,
                color: 14496300,
                author: {
                    name: isAddQueue?"Added to queue":"Now playing",
                    icon_url: video.author.avatar
                },
                thumbnail: {
                    url: video.player_response.videoDetails.thumbnail.thumbnails[video.player_response.videoDetails.thumbnail.thumbnails.length-1].url
                },
                fields: [
                    {
                        name: "Duration",
                        value: lengthFromSeconds(video.player_response.videoDetails.lengthSeconds),
                        inline: true
                    },
                    {
                        name: "Queue position",
                        value: queuePos,
                        inline: true
                    },
                    {
                        name: "Playing in",
                        value: lengthFromSeconds(queueTime),
                        inline: true
                    },
                    {
                        name: "Uploaded by",
                        value: video.author.name,
                        inline: true
                    }
                ],
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
                title: video.player_response.videoDetails.title,
                url: "https://www.youtube.com/watch?v="+video.player_response.videoDetails.videoId,
                color: 14496300,
                author: {
                    name: isAddQueue?":white_check_mark: Added to queue":"Now playing",
                    icon_url: video.author.avatar
                },
                thumbnail: {
                    url: video.player_response.videoDetails.thumbnail.thumbnails[video.player_response.videoDetails.thumbnail.thumbnails.length-1].url
                },
                fields: [
                    {
                        name: "Duration",
                        value: lengthFromSeconds(video.player_response.videoDetails.lengthSeconds),
                        inline: true
                    },
                    {
                        name: "Uploaded by",
                        value: video.author.name,
                        inline: true
                    }
                ],
                footer: {
                    icon_url: msg.author.avatarURL,
                    text: "'"+msg.content.split(" ")[0].substring(prefs.prefix.length)+"' issued by "+msg.author.tag
                }
            }
        });
    }
}

function embedNowPlaying(msg, song, playTime) {
    msg.channel.send({
        embed: {
            title: song.title,
            url: "https://www.youtube.com/watch?v="+song.videoID,
            description: "`"+getProgressBar(playTime, song.lengthSeconds, 30)+"\n"+lengthFromSeconds(playTime)+" / "+lengthFromSeconds(song.lengthSeconds)+"`",
            color: 14496300,
            author: {
                name: "Now playing",
                icon_url: song.avatarURL
            },
            thumbnail: {
                url: song.thumbnailURL
            },
            fields: [
                {
                    name: "Uploaded by",
                    value: song.authorName,
                    inline: true
                },
                {
                    name: "Requested by",
                    value: song.requestedBy,
                    inline: true
                }
            ],
            footer: {
                icon_url: msg.author.avatarURL,
                text: "'"+msg.content.split(" ")[0].substring(prefs.prefix.length)+"' issued by "+msg.author.tag
            }
        }
    });
}

function getProgressBar(timeStart, timeEnd, length) {
    let progress = Math.floor((timeStart/timeEnd)*length);
    if(progress == 0) { progress = 1; }
    return "▬".repeat(progress-1)+"🔘"+"▬".repeat(length-progress-1);
}

function getSongQueue(guild) {
    if(!guild) return;
    if(typeof guild == 'object') guild = guild.id;
    if(!songQueues[guild]) songQueues[guild] = {
        'songs': [],
        'dispatcher': undefined
    };
    return songQueues[guild];
}

function addToQueue(guild, url, length, info, user) {
    let queue = getSongQueue(guild);
    if(queue) {
        let len = queue.songs.push({
            'url': url,
            'title': info.player_response.videoDetails.title,
            'videoID': info.player_response.videoDetails.videoId,
            'lengthSeconds': parseInt(length),
            'avatarURL': info.author.avatar,
            'thumbnailURL': info.player_response.videoDetails.thumbnail.thumbnails[info.player_response.videoDetails.thumbnail.thumbnails.length-1].url,
            'authorName': info.author.name,
            'requestedBy': user
        });

        return len;
    }
    return 0;
}

function playQueue(msg, queue, voiceChannel, firstSong = false) {
    // Stopping if end of queue
    if(!queue.songs[0]) {
        voiceChannel.leave()
        return;
    }

    // Establishing voice connection
    voiceChannel.join().then(connection => {

        // Setting stream options
        const streamOptions = { seek: 0, volume: 0.2 };
        const stream = ytdl(queue.songs[0].url, { filter: 'audioonly' });

        if(!firstSong) {
            stream.on('info', (info) => {
                embedYoutube(msg, info, false);
            });
        }

    
        // Playing the song
        const dispatcher = connection.playStream(stream, streamOptions);
    
        dispatcher.on('end', () => {
            queue.songs.shift();
            playQueue(msg, queue, voiceChannel);
        });
        dispatcher.on('error', (e) => {
            queue.songs.shift();
            console.log("Error: " + e);
        });
    
        queue.dispatcher = dispatcher;
    })
    .catch(err => sendEmbeddedMessage(msg, "Error", ":x: "+err));

}

function initYoutubePlay(videoUrl, voiceChannel, msg) {
    let queueLen = 0;
    let queue = getSongQueue(msg.guild);

    // Getting video info
    ytdl.getBasicInfo(videoUrl, (err, info) => {
        if(err) {
            // Not added to queue for ytdl related reason
            sendEmbeddedMessage(msg, "Error", ":x: "+err);
        }
        else {
            queueLen = addToQueue(msg.guild, videoUrl, info.player_response.videoDetails.lengthSeconds, info, msg.author.username);

            // Success adding to queue
            if(queueLen > 0) {
                embedYoutube(msg, info, true, queueLen, getTimeBeforePlay(queue));

                if(queueLen == 1) { // First song in queue, init play
                    playQueue(msg, queue, voiceChannel, true);
                }
            }

            // Not added to queue for some other reason
            else {
                sendEmbeddedMessage(msg, "Error", ":x: Unable to add song to queue.");
            }
        }
    });
}

function getTimeBeforePlay(queue) {
    let total = 0;
    queue.songs.forEach((song, idx) => {
        if(idx != queue.songs.length-1) {
            total += song.lengthSeconds;
        }
    });
    
    // Remove time of song currently playing
    if(queue.dispatcher && total > 0) {
        total -= Math.floor(queue.dispatcher.time/1000);
    }
    return total;
}

function searchVideos(searchTerms, callback) {
    var service = google.youtube({
        version: 'v3',
        auth: prefs.youtube_api_key
    });

    service.search.list({
        part: 'snippet',
        q: searchTerms,
        maxResults: 1,
        type: "video",
        relevanceLanguage: "en"
    }, function(err, res) {
        if(err) {
            callback(err);
            return;
        }
        callback(undefined, res);
    });
}

function enoughArgs(min, args, msg) {
    if(args.length < min+1) {
        cmd = getCurrentCommand(msg);
        sendEmbeddedMessage(msg, "Error", ':x: Too few arguments. Please type `'+prefs.prefix+"help "+cmd+" "+args[0]+"` for more info");
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
        subcommands: {
            "resize":{
                description: "Resizes the image to the desired width and height",
                usage: "<width> <height>",
                example: "800 600"
            }, 
            "grey": {
                description: "Removes colors from the image",
            }, 
            "mirror": {
                description: "Flips the image, horizontally or vertically",
                usage: "<h|v> (h = horizontal, v = vertical)",
                example: "h"
            },
            "rotate": {
                description: "Rotates the image to the desired angle",
                usage: "<angle> (degrees)",
                example: "130"
            }, 
            "pride": {
                description: "Applies a gay pride filter to the image",
            },
            "blur": {
                description: "Blurs out the image by the given intensity",
                usage: "<intensity>",
                example: "20"
            }, 
            "sepia": {
                description: "Applies a sepia effect on the image to make it look older",
            }, 
            "poster": {
                description: "Posterizes the image, making it look more cartoonish",
                usage: "<intensity> (descending order)",
                example: "5"
            },
            "addtext": {
                description: "Adds a custom text on the image",
                usage: "<text>",
                example: "Kool Kids Klub"
            }
        },
        summon: function(msg, args) {

            // No args
            if(args.length == 0) {
                sendEmbeddedMessage(msg, "Error", ":x: Too few arguments. Type `"+prefs.prefix+"help "+Object.keys(commands)[Object.keys(commands).indexOf(command)]+"` for more info");
                return;
            }
            else if(!Object.keys(this.subcommands).includes(args[0])) {
                sendEmbeddedMessage(msg, "Error", ":x: Unknown argument(s). Type `"+prefs.prefix+"help "+Object.keys(commands)[Object.keys(commands).indexOf(command)]+"` for more info");
                return;
            }

            // No embeds
            if(msg.attachments.size == 0) {
                sendEmbeddedMessage(msg, "Error", ":x: You need to embed and comment an image to perform this command as shown on the image below", "https://pli.io/FGBbm.png")
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
                                sendEmbeddedMessage(msg, "Error", ":x: Text won't fit. Please consider using a bigger image or smaller words");
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
                            sendEmbeddedMessage(msg, "Error", ":x: Width and height are limited to 5000 pixels to spare some bandwidth");
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
                sendEmbeddedMessage(msg, "Error", ":x: An error has occured.\n\r`"+err+"`");
            });
        }
    },
    "play": {
        description: "Plays a youtube video",
        summon: function(msg, args) {
            if(enoughArgs(0, args, msg)) {

                // Check if user is in voice channel
                const { voiceChannel } = msg.member;
    
                if(!voiceChannel) {
                    sendEmbeddedMessage(msg, "Error", ":x: Please join a voice channel first.");
                }

                // Check if link or not
                const ytregex = new RegExp(/^http(s)?:\/\/(www\.)?((youtube\.com\/watch\?v=[a-z0-9-]*)|(youtu\.be\/[a-z0-9-]*))/);
                if(ytregex.test(args[0].toLowerCase())) {

                    //Check if playlist or not
                    const playlistregex = new RegExp(/^http(s)?:\/\/(www\.)?youtube\.com\/watch\?v=[a-z0-9-]*&list=[a-z0-9-]*$/);
                    if(playlistregex.test(args[0].toLowerCase())) {
                        sendEmbeddedMessage(msg, "Error", ":x: Playlists not yet implemented");
                    }
                    else {
                        // Play song
                        initYoutubePlay(args[0], voiceChannel, msg);
                    }
                }
                else { //Search for song then play it
                    let searchTerms = args.join(' ');

                    searchVideos(searchTerms, function(err, res) {
                        if(err) {
                            sendEmbeddedMessage(msg, "Error", ":x: "+err);
                        }
                        else {
                            if(res.data.items.length<1) {
                                sendEmbeddedMessage(msg, "Error", ":x: No results found for these search terms.");
                            }
                            else {
                                // Play song
                                initYoutubePlay("https://youtube.com/watch?v="+res.data.items[0].id.videoId, voiceChannel, msg);
                            }
                        }
                    });
                }

            }
        }
    },
    "stop": {
        description: "Skips the current song and clears the entire queue",
        summon: function(msg, args) {
            let queue = getSongQueue(msg.guild);
            if(queue) {
                queue.songs = [];
                queue.dispatcher.end('stopcmd');
            }
            sendEmbeddedMessage(msg, "Success", ":stop_button: Stopped");
        }
    },
    "skip": {
        description: "Skips the current song",
        summon: function(msg, args) {
            let queue = getSongQueue(msg.guild);
            if(queue) {
                queue.dispatcher.end('skipcmd');
            }
            sendEmbeddedMessage(msg, "Success", ":fast_forward: Song skipped");
        }
    },
    "np": {
        description: "Shows current song info",
        summon: function(msg, args) {
            let queue = getSongQueue(msg.guild);
            if(queue.songs.length>0) {
                embedNowPlaying(msg, queue.songs[0], Math.floor(queue.dispatcher.time/1000));
            }
            else {
                sendEmbeddedMessage(msg, "Error", ":x: No song playing on this server");
            }
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
    
    command = msg.content.toLowerCase().split(" ")[0].substring(prefs.prefix.length);
    args = msg.content.toLowerCase().split(" ");
    args.splice(0,1);

    //Special command, needs to be outside
    if(command === "help") {
        // General help
        if(args.length === 0) {

            description = "**Command List**\n\r"
            propCount = Object.keys(commands).length;
            printedProps = 1;
            for(var prop in commands) {
                description += "**`"+prefs.prefix+prop+"`** - ***"+commands[prop].description
                
                
                +(printedProps<propCount?"***\n\r":"***");
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
        else if(Object.keys(commands).includes(args[0])) {
            // Printing main command to avoid empty help
            description = "**Main command\n\r**`"+prefs.prefix+Object.keys(commands)[Object.keys(commands).indexOf(args[0])]+"` - ***"+commands[args[0]].description+"***\n"+
            "**Usage:** `"+prefs.prefix+Object.keys(commands)[Object.keys(commands).indexOf(args[0])]+(commands[args[0]].usage===undefined?"":" "+commands[args[0]].usage)+"`\n"+
            "**Example:** `"+prefs.prefix+Object.keys(commands)[Object.keys(commands).indexOf(args[0])]+(commands[args[0]].example===undefined?"":" "+commands[args[0]].example)+"`\n\r";
            
            // Counting amount of properties of the subcommand object
            propCount = commands[args[0]].subcommands===undefined?0:Object.keys(commands[args[0]].subcommands).length;
            printedProps = 1;

            //Title
            description += propCount===0?"":"**Subcommands**\n\r"
            
            // Adding each subcommand to description
            for(var prop in commands[args[0]].subcommands) {
                description += "**`"+prefs.prefix+args[0]+" "+prop+"`** - ***"+commands[args[0]].subcommands[prop].description+
                    "***\n**Usage:** `"+prefs.prefix+Object.keys(commands)[Object.keys(commands).indexOf(args[0])]+" "+prop+(commands[args[0]].subcommands[prop].usage!==undefined?" "+commands[args[0]].subcommands[prop].usage:"")+
                    "`\n**Example:** `"+prefs.prefix+Object.keys(commands)[Object.keys(commands).indexOf(args[0])]+" "+prop+(commands[args[0]].subcommands[prop].example!==undefined?" "+commands[args[0]].subcommands[prop].example:"")+
                    (printedProps<propCount?"`\n\r":"`");
                printedProps++;
            }

            msg.channel.send({
                embed: {
                    "color": 8603131,
                    "author": {
                        "name": client.user.username,
                        "icon_url": client.user.avatarURL
                    },
                    "description": description,
                    "footer": {
                        "icon_url": msg.author.avatarURL,
                        "text": "'"+msg.content.split(" ")[0].substring(prefs.prefix.length)+"' issued by "+msg.author.tag
                    }
                }
            });
        }
        else {
            sendEmbeddedMessage(msg, "Error", ":x: This command does not exist. Type "+prefs.prefix+"help for a list of available commands.");
        }
        return;
    }
    // YouTube links are case sensitive
    else if(command === "play" || commands === "p") {
        args = msg.content.split(" ");
        args.splice(0,1);
    }
    // If malformed or invalid command
    else if(commands[command] === undefined) {
        sendEmbeddedMessage(msg, "Error", ":x: Invalid command. Type `"+prefs.prefix+"help` for a list of available commands")
        return;
    }

    commands[command].summon(msg, args);
}



client.on('ready', () => {
    var id = crypto.randomBytes(5).toString('hex');
    console.log(`Logged in as ${client.user.tag}, build id: #`+id);
    client.user.setPresence({game: {name: prefs.prefix+"help | v"+version+" #"+id}, status: 'online'});
});

client.on('message', msg => {
    if (msg.content.startsWith(prefs.prefix)) {
        processCommand(msg);
  }
});

client.login(prefs.token);