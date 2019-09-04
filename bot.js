const prefs = require('./settings.json');
const crypto = require('crypto');
const jimp = require('jimp');
const music = require('./util/music');
const imgUtil = require('./util/image');
const discordUtil = require('./util/discord');
const textUtil = require('./util/text');

const version = "19.08_14";

function enoughArgs(min, args, msg) {
    if(args.length < min+1) {
        cmd = getCurrentCommand(msg);
        discordUtil.sendEmbeddedMessage(msg, "Error", ':x: Too few arguments. Please type `'+prefs.prefix+"help "+cmd+" "+args[0]+"` for more info");
        return false;
    }
    return true;
}

function getCurrentCommand(msg) {
    return msg.content.split(" ")[0].substring(prefs.prefix.length);
}

let commands = {
    "ping": {
        description: "Shows the delay between the bot and Discord servers",
        summon: function(msg, args) {
            msg.channel.send({
                embed: {
                    color: 8603131,
                    author: {
                        name: discordUtil.getClient().user.username,
                        icon_url: discordUtil.getClient().user.avatarURL
                    },
                    fields: [{
                        name: "Server delay",
                        value: ":heartbeat: "+discordUtil.getClient().ping+" ms"
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
                discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Too few arguments. Type `"+prefs.prefix+"help "+Object.keys(commands)[Object.keys(commands).indexOf(command)]+"` for more info");
                return;
            }
            else if(!Object.keys(this.subcommands).includes(args[0])) {
                discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Unknown argument(s). Type `"+prefs.prefix+"help "+Object.keys(commands)[Object.keys(commands).indexOf(command)]+"` for more info");
                return;
            }

            // No embeds
            if(msg.attachments.size == 0) {
                discordUtil.sendEmbeddedMessage(msg, "Error", ":x: You need to embed and comment an image to perform this command as shown on the image below", "https://pli.io/FGBbm.png")
                return;
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
                            discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Width and height are limited to 5000 pixels to spare some bandwidth");
                            return;
                        }

                        img = img.resize(parseInt(args[1]), parseInt(args[2]));
                        img.getBuffer(mime, (err, buf) => { imgUtil.sendImageAsBuffer(err, buf, ":white_check_mark: Your image has been resized to "+parseInt(args[1])+"x"+parseInt(args[2])+" pixels.") }, mime, extension);
                    }
                }
                else if(args[0] === "grey") {
                    img = img.greyscale();
                    img.getBuffer(mime, (err, buf) => { imgUtil.sendImageAsBuffer(err, buf, ":white_check_mark: Your image has been greyed out.") }, mime, extension);
                }
                else if(args[0] === "mirror") {
                    if(enoughArgs(1, args, msg)) {
                        isHorizontal = args[1] === "h"
                        img = img.flip(isHorizontal, !isHorizontal);
                        img.getBuffer(mime, (err, buf) => { imgUtil.sendImageAsBuffer(err, buf, ":white_check_mark Image flipped"+ isHorizontal?"horizontally":"vertically") }, mime, extension);
                    }
                }
                else if(args[0] === "rotate") {
                    if(enoughArgs(1, args, msg)) {
                        deg = parseInt(args[1])
                        img = img.rotate(deg);
                        img = img.background(0x00000000, (err, newimg) => { 
                            mime = jimp.MIME_PNG;
                            extension = "png";
                            newimg.getBuffer(jimp.MIME_PNG, (err, buf) => { imgUtil.sendImageAsBuffer(err, buf, ":white_check_mark: Image rotated by "+deg+" degrees") }, mime, extension);
                        })
                    }
                }
                else if(args[0] === "pride") {
                    jimp.read('mask/pride.png', (err, masked) => {
                        masked.resize(img.bitmap.width, img.bitmap.height);
                        masked.opacity(0.3, (err, fadedMask) => {
                            img.composite(fadedMask, 0, 0, (err, finalImg) => {
                                finalImg.getBuffer(mime, (err, buf) => { imgUtil.sendImageAsBuffer(err, buf, ":white_check_mark: Image has been gayed out", mime, extension) });
                            });
                        })
                    });
                }
                else if(args[0] === "blur") {
                    if(enoughArgs(1, args, msg)) {
                        pixels = parseInt(args[1]);
                        img = img.blur(pixels>100?100:pixels);
                        img.getBuffer(mime, (err, buf) => { imgUtil.sendImageAsBuffer(err, buf, ":white_check_mark: Image has been blurred by "+ (pixels>100?100:pixels) +" pixels",mime, extension) });
                    }
                }
                else if(args[0] === "sepia") {
                    img.sepia((err, sepiad) => {
                        sepiad.getBuffer(mime, (err, buf) => { imgUtil.sendImageAsBuffer(err, buf, ":white_check_mark: Image has been aged out", mime, extension) });
                    });
                }
                else if(args[0] === "poster") {
                    if (enoughArgs(1, args, msg)) {
                        level = parseInt(args[1]);
                        img.posterize(level, (err, postered) => { 
                            postered.getBuffer(mime, (err, buf) => { 
                                imgUtil.sendImageAsBuffer(err, buf, ":white_check_mark: Image has been posterized (level "+level+")");
                             });
                         });
                    }
                }
                else if(args[0] === "addtext") {
                    if(enoughArgs(1, args, msg)) {
                        textArray = args.slice(1);
                        img = imgUtil.writeArrayToImage(textArray, img, 128, mime, extension);
                    }
                }

            }).catch(function (err) {
                discordUtil.sendEmbeddedMessage(msg, "Error", ":x: An error has occured.\n\r`"+err+"`");
            });
        }
    },
    "play": {
        description: "Plays a youtube video",
        summon: function(msg, args) {
            if(enoughArgs(0, args, msg)) {

                // Check if user is in voice channel
                const { channel } = msg.member.voice;
    
                if(!channel) {
                    discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Please join a voice channel first.");
                    return;
                }

                // Check if link or not
                const ytregex = new RegExp(/^http(s)?:\/\/(www\.)?((youtube\.com\/watch\?v=[a-z0-9-]*)|(youtu\.be\/[a-z0-9-]*))/);
                if(ytregex.test(args[0].toLowerCase())) {

                    //Check if playlist or not
                    const playlistregex = new RegExp(/^http(s)?:\/\/(www\.)?youtube\.com\/watch\?v=[a-z0-9-]*&list=[a-z0-9-]*$/);
                    if(playlistregex.test(args[0].toLowerCase())) {
                        discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Playlists not yet implemented");
                    }
                    else {
                        // Play song
                        music.initYoutubePlay(args[0], channel, msg);
                    }
                }
                else { //Search for song then play it
                    let searchTerms = args.join(' ');

                    music.searchVideos(searchTerms, function(err, res) {
                        if(err) {
                            discordUtil.sendEmbeddedMessage(msg, "Error", ":x: "+err);
                        }
                        else {
                            // Play song
                            music.initYoutubePlay("https://youtube.com"+res, channel, msg);
                        }
                    });
                }

            }
        }
    },
    "stop": {
        description: "Skips the current song and clears the entire queue",
        summon: function(msg, args) {
            let queue = music.getSongQueue(msg.guild);
            if(queue) {
                queue.songs = [];
                queue.dispatcher && queue.dispatcher.end('stopcmd');
            }
            discordUtil.sendEmbeddedMessage(msg, "Success", ":stop_button: Stopped");
        }
    },
    "pause": {
        description: "Pauses the current song",
        summon: function(msg, args) {
            let queue = music.getSongQueue(msg.guild);
            if(queue.dispatcher.paused) {
                discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Song is already paused");
            }
            else {
                queue.dispatcher.pause();
                discordUtil.sendEmbeddedMessage(msg, "Success", ":pause_button: Song paused");
            }
        }
    },
    "resume": {
        description: "Resumes the current song",
        summon: function(msg, args) {
            let queue = music.getSongQueue(msg.guild);
            if(queue.dispatcher.paused) {
                queue.dispatcher.resume()
                discordUtil.sendEmbeddedMessage(msg, "Success", ":arrow_forward: Song resumed");
            }
            else {
                discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Song not paused");
            }
        }
    },
    "forward": {
        description: "Fast forwards the current song for the desired seconds",
        summon: function(msg, args) {
            // if(enoughArgs(0, args, msg)) {
            //     if(parseInt(args[0]) > 0) {

            //         // Get info on current song
            //         let queue = getSongQueue(msg.guild);
            //         let time = queue.dispatcher.time;
                    
            //         // Inserting duplicate of song
            //         queue.songs.splice(1,0,{
            //             'url': queue.songs[0].url,
            //             'title': queue.songs[0].title,
            //             'videoID': queue.songs[0].videoID,
            //             'lengthSeconds': queue.songs[0].lengthSeconds,
            //             'avatarURL': queue.songs[0].avatarURL,
            //             'thumbnailURL': queue.songs[0].thumbnailURL,
            //             'authorName': queue.songs[0].authorName,
            //             'requestedBy': queue.songs[0].requestedBy
            //         });

            //         let beginTime = parseInt(time/1000)+parseInt(args[0]);

            //         if(beginTime > queue.songs[0].lengthSeconds) {
            //             queue.dispatcher.end('skipcmd');
            //         }
            //         else {
            //             // Replacing old song to play new one
            //             queue.dispatcher.end('fastforward.'+beginTime);
            //         }
        
            //         discordUtil.sendEmbeddedMessage(msg, "Success", ":fast_forward: Song fast forwarded to "+lengthFromSeconds(beginTime))
            //     }
            // }

            discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Feature temporarily disabled");

        }

    },
    "skip": {
        description: "Skips the current song",
        summon: function(msg, args) {
            let queue = music.getSongQueue(msg.guild);
            if(queue) {
                queue.dispatcher && queue.dispatcher.end('skipcmd');
            }
            discordUtil.sendEmbeddedMessage(msg, "Success", ":track_next: Song skipped");
        }
    },
    "np": {
        description: "Shows current song info",
        summon: function(msg, args) {
            let queue = music.getSongQueue(msg.guild);
            if(queue.songs.length>0) {
                music.embedNowPlaying(msg, queue.songs[0], Math.floor(queue.dispatcher.streamTime/1000));
            }
            else {
                discordUtil.sendEmbeddedMessage(msg, "Error", ":x: No song playing on this server");
            }
        }
    },
    "queue": {
        description: "Shows the queue for this server",
        summon: function(msg, args) {
            let queue = music.getSongQueue(msg.guild);

            // Checking page requested
            let page = 1;
            if(args[0] && args[0] > 0) { page = parseInt(args[0]) }
            let totalPages = Math.ceil((queue.songs.length-1)/10);
            if(totalPages === 0) { totalPages = 1; }
            if(page > totalPages) {
                discordUtil.sendEmbeddedMessage(msg, "Error", ":x: There aren't that many songs !")
                return;
            }

            // Checking queue
            if(queue.songs.length>0) {
                music.embedQueue(msg, queue, page);
            }
            else {
                discordUtil.sendEmbeddedMessage(msg, "Error", ":x: The queue is empty");
            }
        }
    },
    "remove": {
        description: "Remove a song from the queue",
        summon: function(msg, args) {
            if(enoughArgs(0, args, msg)) {
                let queue = music.getSongQueue(msg.guild);
                let index = parseInt(args[0]);
                if(index === 0) {
                    discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Type "+prefs.preix+"skip if you want to skip the current song.");
                }
                if(index > 0 && index < queue.songs.length) {
                    queue.songs.splice(index, 1);
                    discordUtil.sendEmbeddedMessage(msg, "Success", ":white_check_mark: Song removed from queue")
                }
                else {
                    discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Invalid song index")
                }
            }
        }
    },
    "clear": {
        description: "Clears the entire queue",
        summon: function(msg, args) {
            let queue = music.getSongQueue(msg.guild);
            queue.songs.splice(1, queue.songs.length-1);
            discordUtil.sendEmbeddedMessage(msg, "Success", ":bomb: Queue cleared")
        }
    },
    "autoplay": {
        description: "Toggles playing related videos automatically",
        summon: function(msg, args) {
            let queue = music.getSongQueue(msg.guild);
            queue.autoplay = !queue.autoplay
            discordUtil.sendEmbeddedMessage(msg, "Success", ":white_check_mark: Autoplay is now "+(queue.autoplay?"ON":"OFF"));
        }
    },
    "retard": {
        description: "Transforms this sentence into tHiS sEnTeNcE",
        summon: function(msg, args) {
            args = args.join(' ');
            discordUtil.sendSimpleMessage(msg, textUtil.retard(args));
        }
    }
}

commands['p']   = makeCmdAlias('play');
commands['s']   = makeCmdAlias('skip');
commands['ap']  = makeCmdAlias('autoplay');

function makeCmdAlias(cmd) {
    return {
        description: commands[cmd].description || undefined,
        summon: commands[cmd].summon || undefined,
        subcommands: commands[cmd].subcommands || undefined
    };
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
                    "name": discordUtil.getClient().user.username,
                    "icon_url": discordUtil.getClient().user.avatarURL
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
                        "name": discordUtil.getClient().user.username,
                        "icon_url": discordUtil.getClient().user.avatarURL
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
            discordUtil.sendEmbeddedMessage(msg, "Error", ":x: This command does not exist. Type "+prefs.prefix+"help for a list of available commands.");
        }
        return;
    }
    // YouTube links are case sensitive
    else if(command === "play" || command === "p") {
        args = msg.content.split(" ");
        args.splice(0,1);
    }
    // If malformed or invalid command
    else if(commands[command] === undefined) {
        discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Invalid command. Type `"+prefs.prefix+"help` for a list of available commands")
        return;
    }

    commands[command].summon(msg, args);
}

function handleStdin() {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write('>> ');
    stdin.setEncoding('utf-8');
    stdin.on('data', (data) => {
        data = data.toLowerCase().replace('\n','').replace('\r', '');
        switch(data) {
            case 'exit':
                process.exit(0);
                break;
            default:
                console.log('Unknown command.');
        }
        stdout.write('>> ');
    });
}

discordUtil.getClient().on('ready', () => {
    var id = crypto.randomBytes(5).toString('hex');
    console.log(`Logged in as ${discordUtil.getClient().user.tag}, build id: #`+id);
    discordUtil.getClient().user.setPresence({game: {name: prefs.prefix+"help | v"+version+" #"+id}, status: 'online'});
    handleStdin();
});

discordUtil.getClient().on('message', msg => {
    if (msg.content.startsWith(prefs.prefix)) {
        processCommand(msg);
    }
});

discordUtil.getClient().login(prefs.token);