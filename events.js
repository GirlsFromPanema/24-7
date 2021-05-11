module.exports = (client, Discord, ee) => {
    var prefix = require("./config.json").prefix;


    client.on("ready", () => {
        console.log(`Logged in as ${client.user.tag}`)
        client.user.setActivity(`${client.guilds.cache.map(s => s.serverCount).reduce((a, b) => a + b)} Servers || *setup`, { type: 'WATCHING' })

        setInterval(async ()=>{
            for(const guild of client.guilds.cache.array()){
                client.db.ensure(guild.id, {
                    song: "https://www.youtube.com/watch?v=-ObdvMkCKws",
                    channel: "no",
                })
                var data = client.db.get(guild.id)
                if(data.channel == "no") continue;
                var channel = guild.channels.cache.get(data.channel)
                if(channel.members.array().length > 2) continue;
                var txtchannel = guild.channels.cache.find(
                    channel =>
                    channel.type === "text" &&
                    channel.permissionsFor(guild.me).has("SEND_MESSAGES")
                    );
                var message = await txtchannel.send("✳️ Joining voice channel...").then(msg=>msg.delete())
                const botchannel = message.guild.me.voice.channel;
                if(botchannel) continue;
                message.member.voice.channel = channel;
                try{
                    var voicechannel = message.guild.channels.cache.get(data.channel);
                    if(!voicechannel) continue;
                    if(voicechannel.type == "voice") {
                        setTimeout(async()=>{
                            await voicechannel.join().catch(e=>console.log(e))
                            client.distube.play(message, data.song);
                        }, 400)
                    }
                }catch (e){
                    console.log(e)
                }
            }
        }, 60000)
    })


    client.on("message", async (message) => {
        if(!message.guild || message.author.bot) return;
        if(!message.content.startsWith(prefix)) return;

        // "!play a b c d" --> "play a b c d" --> ["a", "b", "c", "d"] && cmd == "play".toLowerCase()
        var args = message.content.slice(prefix.length).trim().split(" ");
        var cmd = args.shift().toLowerCase();

        client.db.ensure(message.guild.id, {
            song: "https://www.youtube.com/watch?v=-ObdvMkCKws",
            channel: "no",
        })


        if(cmd == "setup"){
            const { channel } = message.member.voice;
            if(!channel) return message.reply("📛 Please join a VC first, then re-run this command!")

            if(!args[0]) return message.reply("📛 Please enter a valid Youtube/soundcloud TRACK/PLAYLIST")
            // ["a", "n"] --> "a n"
            client.db.set(message.guild.id, args.join(" ") ,"song")
            client.db.set(message.guild.id, channel.id, "channel");
            message.reply("✅ Success!")
            var data = client.db.get(message.guild.id);
            try {
                var vc = message.guild.channels.cache.get(data.channel)
                if(!vc) return message.reply("📛 I could not find your wished Channel")
                if(vc.type == "voice"){
                    await vc.join().catch(e=>console.log(e))
                    await client.distube.play(message, data.song)
                    client.distube.shuffle(message);
                    return message.reply("✅ Joined and started playing!")
                }
            }catch (e){
                message.channel.send(e.message, {code: "js"});
                console.log(e)
            }
        }
        if(cmd == "join") {
            const botchannel = message.guild.me.voice.channel;
            if(botchannel) return message.reply("⚠️ I am already connected somewhere");

            var data = client.db.get(message.guild.id);
            if(data.channel == "no") return message.reply(`⚠️ No setup done yet! do it with: ${prefix}setup`)

            try{
                var vc = message.guild.channels.cache.get(data.channel)
                if(!vc) return message.reply("⚠️ I could not find your wished Channel")
                if(vc.type == "voice"){
                    await vc.join().catch(e=>console.log(e))
                    await client.distube.play(message, data.song)
                    client.distube.shuffle(message);
                    return message.reply("✅ Joined and started playing in the setup Channel!")
                }
            }catch (e){
                message.channel.send(e.message, {code: "js"});
                console.log(e)
            }
        }
        if(cmd == "rejoin") {
            const botchannel = message.guild.me.voice.channel;
            if(botchannel) await message.guild.me.voice.kick().catch(e=>console.log(e))

            var data = client.db.get(message.guild.id);
            if(data.channel == "no") return message.reply(`⚠️ No setup done yet! do it with: ${prefix}setup`)

            try{
                var vc = message.guild.channels.cache.get(data.channel)
                if(!vc) return message.reply("⚠️ I could not find your wished Channel")
                if(vc.type == "voice"){
                    await vc.join().catch(e=>console.log(e))
                    await client.distube.play(message, data.song)
                    client.distube.shuffle(message);
                    return message.reply("✅ Rejoined and started playing in the setup Channel!")
                }
            }catch (e){
                message.channel.send(e.message, {code: "js"});
                console.log(e)
            }
        }
        if(cmd == "stop" || cmd == "leave" || cmd == "disconnect" || cmd == "dis" ) {
            const botchannel = message.guild.me.voice.channel;
            if(!botchannel) return message.reply("⚠️ I am not connected somewhere");
            message.guild.me.voice.kick().catch(e=>console.log(e));
            return message.reply("✅ Stopped and leaft the Channel!")
        }
        if(cmd == "play"){
            const botchannel = message.guild.me.voice.channel;
            const { channel } = message.member.voice;
            if(!channel) return message.reply("⚠️ Please join a Voice Channel first!")
            if(botchannel && client.distube.getQueue(message) && channel.id != botchannel.id) return message.reply("⚠️ I am already playing somewhere");
            client.playcmd = true;
            client.distube.play(message, args.join(" "));
        }
        if(cmd == "help"){
            message.reply(`
        Here are my Commands:
        1️⃣ **setup** (Setup the Bot for your Server)
        2️⃣ **play** [Song] (Play any song you like in your VC)
        3️⃣ **rejoin** (Something went wrong? Let the bot rejoin!)
        4️⃣ **join** (Should the bot really join your voice channel? :D)
        5️⃣ **stop/leave/dis** (Stop/disconnect the bot playing music)
            `)
        }
    })


    client.on("voiceStateUpdate", async (oldState, newState) => {
        let user = newState.member.user.tag;
        if(newState.member.user.bot) return;
        if(!oldState.streaming && newState.streaming) return;
        if(oldState.streaming && !newState.streaming) return;

        if(!oldState.serverDeaf && newState.serverDeaf) return;
        if(oldState.serverDeaf && !newState.serverDeaf) return;

        if(!oldState.serverMute && newState.serverMute) return;
        if(oldState.serverMute && !newState.serverMute) return;

        if(!oldState.selfDeaf && newState.selfDeaf) return;
        if(oldState.selfDeaf && !newState.selfDeaf) return;

        if(!oldState.selfMute && newState.selfMute) return;
        if(oldState.selfMute && !newState.selfMute) return;

        if(!oldState.selfVideo && newState.selfVideo) return;
        if(oldState.selfVideo && !newState.selfVideo) return;

        //JOINED VOICE CHANNEL
        if(!oldState.channelID && newState.channelID){
            var data = client.db.get(newState.guild.id);
            if(data.channel == "no") return;
            if(data.channel == newState.channelID){
                if(newState.channel.members.array().length > 2) return;
                var channel = newState.guild.channels.cache.find(channel => 
                    channel.type === "text" && 
                    (channel.permissionsFor(newState.guild.id).has("SEND_MESSAGES") || channel.permissionsFor(newState.guild.me).has("SEND_MESSAGES")))

                if(!channel) return;
                var message = await channel.send("Joining Voice Channel ...").then(msg=>msg.delete())
                const botchannel = message.guild.me.voice.channel;
                if(botchannel) await message.guild.me.voice.kick().catch(e=>console.log(e))

                message.member = newState.member;
                message.member.voice.channel = newState.channel;

                try{
                    var vc = message.guild.channels.cache.get(data.channel)
                    if(!vc) return;
                    if(vc.type == "voice"){
                        setTimeout(async ()=>{
                            await vc.join().catch(e=>console.log(e))
                            await client.distube.play(message, data.song)
                            client.distube.shuffle(message);
                        }, 400)
                    }
                }catch (e){
                    console.log(e)
                }
            }
        }

        //SWITCH VOICE CHANNEL
        if(oldState.channelID && newState.channelID){
            var data = client.db.get(newState.guild.id);
            if(data.channel == "no") return;
            if(data.channel == newState.channelID){
                if(newState.channel.members.array().length > 2) return;
                var channel = newState.guild.channels.cache.find(channel => 
                    channel.type === "text" && 
                    (channel.permissionsFor(newState.guild.id).has("SEND_MESSAGES") || channel.permissionsFor(newState.guild.me).has("SEND_MESSAGES")))

                if(!channel) return;
                var message = await channel.send("✳️ Joining Voice Channel ...").then(msg=>msg.delete())
                const botchannel = message.guild.me.voice.channel;
                if(botchannel) await message.guild.me.voice.kick().catch(e=>console.log(e))

                message.member = newState.member;
                message.member.voice.channel = newState.channel;

                try{
                    var vc = message.guild.channels.cache.get(data.channel)
                    if(!vc) return;
                    if(vc.type == "voice"){
                        setTimeout(async ()=>{
                            await vc.join().catch(e=>console.log(e))
                            await client.distube.play(message, data.song)
                            client.distube.shuffle(message);
                        }, 400)
                    }
                }catch (e){
                    console.log(e)
                }
            }
            if(data.channel == oldState.channelID){
                try{
                    if(oldState.channel.members.array().length >= 2) return;
                    const botchannel = newState.guild.me.voice.channel;
                    if(botchannel){
                        await newState.guild.me.voice.kick().catch(e=>console.log(e))
                    }
                    setTimeout(async () => {
                        await oldState.channel.join().catch(e=>console.log(e))
                    })
                }catch (e){
                    console.log(e)
                }
            }
        }

        //LEAVE VOICE CHANNEL
        if(oldState.channelID && !newState.channelID){
            var data = client.db.get(newState.guild.id);
            if(data.channel == "no") return;
            if(data.channel == oldState.channelID){
                try{
                    if(oldState.channel.members.array().length >= 2) return;
                    const botchannel = newState.guild.me.voice.channel;
                    if(botchannel){
                        await newState.guild.me.voice.kick().catch(e=>console.log(e))
                    }
                    setTimeout(async () => {
                        await oldState.channel.join().catch(e=>console.log(e))
                    })
                }catch (e){
                    console.log(e)
                }
            }
        }
    })


}