const ytdl = require('ytdl-core');
const htmlparser = require('htmlparser2');
const https = require('https');
const discordUtil = require('./discord');
const prefs = require('../settings.json');

const songQueues = {};

exports.lengthFromSeconds = function(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor(seconds / 60) - hours * 60;
    var seconds = seconds - hours * 3600 - minutes * 60;

    return (hours>0?hours.toString().padStart(2, '0')+":":'')+minutes.toString().padStart(2, '0')+":"+seconds.toString().padStart(2, '0');
}

exports.embedYoutube = function(msg, video, isAddQueue, queuePos = 1, queueTime = 0) {

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
                        value: exports.lengthFromSeconds(video.player_response.videoDetails.lengthSeconds),
                        inline: true
                    },
                    {
                        name: "Queue position",
                        value: queuePos,
                        inline: true
                    },
                    {
                        name: "Playing in",
                        value: exports.lengthFromSeconds(queueTime),
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
                        value: exports.lengthFromSeconds(video.player_response.videoDetails.lengthSeconds),
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

exports.embedNowPlaying = function(msg, song, playTime) {
    msg.channel.send({
        embed: {
            title: song.title,
            url: "https://www.youtube.com/watch?v="+song.videoID,
            description: "`"+exports.getProgressBar(playTime, song.lengthSeconds, 30)+"\n"+exports.lengthFromSeconds(playTime)+" / "+exports.lengthFromSeconds(song.lengthSeconds)+"`",
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

exports.getProgressBar = function(timeStart, timeEnd, length) {
    let progress = Math.floor((timeStart/timeEnd)*length);
    if(progress == 0) { progress = 1; }
    return "▬".repeat(progress-1)+"🔘"+"▬".repeat(length-progress-1);
}

exports.getSongQueue = function(guild) {
    if(!guild) return;
    if(typeof guild == 'object') guild = guild.id;
    if(!songQueues[guild]) songQueues[guild] = {
        'songs': [],
        'history': [],
        'dispatcher': undefined,
        'autoplay': true
    };
    return songQueues[guild];
}

exports.addToQueue = function(queue, url, length, info, user) {
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

exports.addToHistory = function(queue, url) {
    let id = ytdl.getURLVideoID(url);
    queue.history.unshift(id);
    queue.history[10] = null; // Maximum history
}

exports.playQueue = function(msg, queue, voiceChannel, firstSong = false, timing = "0s", videoInfo) {
    // Stopping if end of queue
    if(!queue.songs[0]) {
        voiceChannel.leave()
        return;
    }

    // Checking if joinable voice channel
    if(!voiceChannel.joinable) {
        discordUtil.sendEmbeddedMessage(msg, 'Error', ':x: Cannot join `'+voiceChannel.name+'`\nPlease make sure I have enough permissions to join first.');
        queue.songs = [];
        return;
    }

    // Establishing voice connection
    voiceChannel.join().then(connection => {
        // Adding song to history
        exports.addToHistory(queue, queue.songs[0].url);

        // Setting up and playing audio
        const streamOptions = { seek: 0, volume: 0.2};
        let ytdlOptions = {filter: 'audioonly'};
        if(timing != "0s") { ytdlOptions.begin = timing }

        let stream = ytdl(queue.songs[0].url, ytdlOptions);

        if(!firstSong) {
            stream.on('info', (info) => {
                exports.embedYoutube(msg, info, false);
            });
        }
        if(videoInfo) { // Hack until issue #443 ytdl-core is solved
            ytdl.getInfo(queue.songs[0].url, (err, info) => {
                exports.embedYoutube(msg, videoInfo, false);
            });
        }
    
        // Playing the song
        let dispatcher = connection.play(stream, streamOptions);
        queue.dispatcher = dispatcher;
    
        dispatcher.on('finish', (reason) => {
            // stream._events.info("lmao niggers");
            stream.destroy();
            if(reason) { // Deprecated with discordjs 12
                console.log("reason",reason);
                if(reason.startsWith('fastforward')) {
                    queue.songs.shift();
                    let timing = parseInt(reason.split('.')[1])+'s'
                    exports.playQueue(msg, queue, voiceChannel, true, timing);
                }
                else {
                    queue.songs.shift();
                    exports.playQueue(msg, queue, voiceChannel);
                }
            }
            else {
                // Autoplay enabled
                if(queue.autoplay && queue.songs.length == 1) {
                    let url = queue.songs[0].url;
                    ytdl.getInfo(url, (err, info) => {
                        if(err) {
                            discordUtil.sendEmbeddedMessage(msg, "Error",":x: [Autoplay] "+err);
                        }
                        else {
                            // Checking history to avoid infinite loop
                            let relatedIdx = 0;
                            for(id of queue.history) {
                                if(id === info.related_videos[0].id) {
                                    relatedIdx++;
                                    while(info.related_videos[relatedIdx].list) relatedIdx++; // Prevents autoplaying playlists
                                    break;
                                }
                            }
                            let relatedLink = "https://www.youtube.com/watch?v="+info.related_videos[relatedIdx].id

                            // Adding video to queue
                            ytdl.getInfo(relatedLink, (err2, info2) => {
                                if(err2) {
                                    discordUtil.sendEmbeddedMessage(msg, "Error",":x: [Autoplay] "+err2);
                                    console.log(relatedLink);
                                }
                                else {
                                    queue.songs.shift();
                                    exports.addToQueue(queue, relatedLink, info2.player_response.videoDetails.lengthSeconds, info2, msg.author.username);
                                    exports.playQueue(msg, queue, voiceChannel, false, "0s", info2);
                                }
                            });
                        }
                    });
                }
                else {
                    queue.songs.shift();
                    exports.playQueue(msg, queue, voiceChannel);
                }
                dispatcher.destroy();
            }
        });
        dispatcher.on('error', (e) => {
            queue.songs.shift();
            discordUtil.sendEmbeddedMessage(msg, "Error", ":x: [Dispatcher] " +e);
        });
    
    })
    .catch(err => discordUtil.sendEmbeddedMessage(msg, "Error", ":x: "+err));

}

exports.initYoutubePlay = function(videoUrl, voiceChannel, msg) {
    let queueLen = 0;
    let queue = exports.getSongQueue(msg.guild);

    // Getting video info
    ytdl.getBasicInfo(videoUrl, (err, info) => {
        if(err) {
            // Not added to queue for ytdl related reason
            discordUtil.sendEmbeddedMessage(msg, "Error", ":x: "+err);
        }
        else {
            queueLen = exports.addToQueue(queue, videoUrl, info.player_response.videoDetails.lengthSeconds, info, msg.author.username);

            // Success adding to queue
            if(queueLen > 0) {
                exports.embedYoutube(msg, info, true, queueLen, exports.getTimeBeforePlay(queue));

                if(queueLen == 1) { // First song in queue, init play
                    exports.playQueue(msg, queue, voiceChannel, true);
                }
            }

            // Not added to queue for some other reason
            else {
                discordUtil.sendEmbeddedMessage(msg, "Error", ":x: Unable to add song to queue.");
            }
        }
    });
}

exports.getTimeBeforePlay = function(queue) {
    let total = 0;
    queue.songs.forEach((song, idx) => {
        if(idx != queue.songs.length-1) {
            total += song.lengthSeconds;
        }
    });
    
    // Remove time of song currently playing
    if(queue.dispatcher && total > 0) {
        total -= Math.floor(queue.dispatcher.streamTime/1000);
    }
    return total;
}

exports.getQueueTime = function(queue) {
    let total = 0;
    queue.songs.forEach((song, idx) => {
        total += song.lengthSeconds;
    });
    
    // Remove time of song currently playing
    if(queue.dispatcher && total > 0) {
        total -= Math.floor(queue.dispatcher.streamTime/1000);
    }
    return total; 
}

exports.searchVideos = function(searchTerms, callback) {
    
    // Parsing routine
    let found = false;
    let parser = new htmlparser.Parser({
        onopentag: (name, attribs) => {
            if(!found && name === 'a' && (attribs.href && attribs.href.startsWith('/watch?v='))) { // Take first result
                found = true;
                callback(undefined, attribs.href);
            }
        },
        onend: () => {
            if (!found) {
                callback('No results', undefined)
            }
        }
    }, {decodeEntities: true});
    

    // Requesting YouTube
    const options = {
        hostname: 'www.youtube.com',
        headers: { 'User-Agent': 'Zimbro' }
    }

    https.get('https://www.youtube.com/results?search_query='+searchTerms.split(' ').join('+'), options, (resp) => {
        let data = '';

        resp.on('data', chunk => {
            data+=chunk
        });

        resp.on('end', () => {
            parser.write(data);
            parser.end();
        })
    });
}

exports.embedQueue = function(msg, queue, page) {

    let totalPages = Math.ceil((queue.songs.length-1)/10);
    if(totalPages === 0) { totalPages = 1; }

    let prettyQueue = page===1?':arrow_forward: **Now playing**':':arrow_heading_down: **Upcoming**';
    if(page === 1) { // Printing now playing
        prettyQueue+='\n['+queue.songs[0].title+']('+queue.songs[0].url+') `('+exports.lengthFromSeconds(queue.songs[0].lengthSeconds)+') ౼ Requested by '+queue.songs[0].requestedBy+'`\n\n:arrow_heading_down: **Upcoming**';
    }

    // Pretty printing page
    for(var i = ((page-1)*10)+1; i <= page*10; i++) {
        if(!queue.songs[i]) { break; }
        prettyQueue+='\n`'+i+'.` ['+queue.songs[i].title+']('+queue.songs[i].url+') `('+exports.lengthFromSeconds(queue.songs[i].lengthSeconds)+') ౼ Requested by '+queue.songs[i].requestedBy+'`\n';
    };

    msg.channel.send({
        embed: {
            description: prettyQueue,
            color: 8603131,
            author: {
                name: discordUtil.getClient().user.username + " | Queue length: "+exports.lengthFromSeconds(exports.getQueueTime(queue)),
                icon_url: discordUtil.getClient().user.avatarURL
            },
            footer: {
                icon_url: msg.author.avatarURL,
                text: "'"+msg.content.split(" ")[0].substring(prefs.prefix.length)+"' issued by "+msg.author.tag + ' | Page '+page+'/'+totalPages
            }
        }
    });
}