const console = require('console');
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
const fs = require("fs");
const { setInterval } = require('timers/promises');
const config = JSON.parse(fs.readFileSync("./config.json"))
const browser = require("./utils/browser");

let haveClaim = false,rollAfterInit = false,init = false;

let ogClaimReset = 3600000 * 3, ogRollReset = 3600000, ogDKReset = 3600000 * 24,numRolls = 0;

const driver = new browser();
const tuRe = /\*\*.*\*\*.*(can't|__can__) claim.*\*\*[0-9]{1,2}(h [0-9]{1,2}){0,1}\*\* min.\n.*\*\*[0-9]{1,2}\*\*.*.*\*\*[0-9]{1,2}\*\* min./
const testRolls = /[0-9]{1,2} \/ [0-9]{1,2}/
const successfulClaim = new RegExp("\\*\\*" + config.username + "\\*\\*.* are now married!" )
let list = []
let claimTimer,rollTimer,kakeraTimer;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const readWishList = ()=>{
    console.log("parsing lovelist.....")
    const initialList = fs.readFileSync("./waifu_list/lovelist.txt",{encoding:"utf-8"}).split("\n");
    for(var i = 0;i<initialList.length;i++){
        if(!initialList[i].startsWith("#")){
            list.push(initialList[i]);
        }
    }
    console.log("Love list: " + list.toString())
}

const rollWaifu = async () => {
    for (var i = 0; i < 10; i++) {
        await driver.sendMessage(config.claimCommand);
        await sleep(1000);
    }
}

const getDailyKakera = () => {
    driver.sendMessage("$dk");
}

const setTimers = (claimTime, rollTime, DKTime) => {
   rollTimer = setTimeout(async () => {
        await rollWaifu();
        setInterval(async () => {
            await rollWaifu();
        }, ogRollReset)
    }, rollTime)

    claimTimer = setTimeout(() => {
        haveClaim = true;
        setInterval(() => {
            haveClaim = true;
        }, ogClaimReset)
    }, claimTime)

    kakeraTimer = setTimeout(() => {
        getDailyKakera();
        setInterval(() => {
            getDailyKakera();
        }, ogDKReset);
    }, DKTime)
}

const initTimer = async(tu) => {
    //test whether if it is from a tu command
    let username = tu.substring(2, tu.indexOf("**", 2));
    if (username == config.username) {
        let claimRe = /(can't|__can__) claim/;
        let claimStatement = claimRe.exec(tu);
        if (claimStatement.length == 0) {
            console.log("something weird happened sad :(");
            return false;
        }
        if (claimStatement[0] == "__can__ claim") {
            console.log("Claim is available!");
            haveClaim = true;
        }
        else if (claimStatement[0] == "can't claim") {
            console.log("Claim is not available!")
        }

        let yes = tu.substring(tu.indexOf("have") + 4, tu.indexOf("rolls")).replaceAll("*", "")
        numRolls = parseInt(yes);
        if(numRolls > 0){
            rollAfterInit = true;
            console.log(`Number of rolls left: ${numRolls}, will roll after initializing...`);
        }
        // for(var i = 0;i<10;i++){
        //     driver.sendMessage(config.claimCommand);
        // }
        let dk = false;
        if(tu.indexOf("$dk is ready") != -1){
            console.log("$dk is available! claiming kakera now....")
            await driver.sendMessage("$dk");
            dk = true;
        }
        let timeRe = /\*\*[0-9]{1,2}(h [0-9]{1,2}){0,1}\*\* min./g
        let timeStatement = [...tu.matchAll(timeRe)]
        if (timeStatement.length < 3 && !dk) {
            console.log("something weird happened sad :(")
            return false;
        }
        else {
            let claimReset = timeStatement[0][0].replaceAll("*", "");
            let rollReset = timeStatement[1][0].replaceAll("*", "");
            let DKreset = "";
            let DKTime = 0;
            if(!dk){
                let DKreset = timeStatement[timeStatement.length - 1][0].replaceAll("*", "");
                if ((i = DKreset.indexOf("h")) != -1) {
                    DKTime += parseInt(DKreset.substring(0, i)) * 3600000;
                    DKTime += parseInt(DKreset.substring(i + 1)) * 60000;
                }
                else {
                    DKTime = parseInt(DKreset.substring(0, DKreset.indexOf("min"))) * 60000;
                }
                
            }
            else{
                DKreset = "20h 00min";
                DKTime += 3600000 * 20;
            }
            console.log(`Claim resets in ${claimReset}`);
            console.log(`Rolls resets in ${rollReset}`);
            console.log(`$dk reset in ${DKreset}`);
            console.log("Setting timers for respective resets...")
            let claimTime = 0, rollTime = 0;
            try {
                if ((i = claimReset.indexOf("h")) != -1) {
                    claimTime += parseInt(claimReset.substring(0, i)) * 3600000;
                    claimTime += parseInt(claimReset.substring(i + 1)) * 60000;
                }
                else {
                    claimTime = parseInt(claimReset.substring(0, claimReset.indexOf("min"))) * 60000;
                }
                rollTime = parseInt(rollReset.substring(0, rollReset.indexOf("min"))) * 60000;
                setTimers(claimTime,rollTime,DKTime);
                console.log("Timers Set!")
            } catch (error) {
                return false;
            }

        }
        console.log("Initialisation complete!")
        return true;
    }
    return false;
}

readWishList();

client.on("ready",async()=>{
    console.log(`Bot logged in as ${client.user.tag}`);
    console.log("Attempting to login to discord and collect rolls information.....")
    await driver.connectToDiscordAndLogin();
    await driver.sendMessage("$tu");
})

client.on("messageCreate",async(message)=>{
    if(message.author.id == config.mudaeID && message.channelId == config.channelID){
        if(!init){
            if(tuRe.test(message.content) && await initTimer(message.content)){
                init = true;
                console.log("Done!");
                if(rollAfterInit){
                    console.log("rolling...");
                    for(let i = 0;i<numRolls;i++){
                        await driver.sendMessage(config.claimCommand);
                        await sleep(1000)
                        
                    }
                }
            }
        }
        else{
            
            let embeds  =  message.embeds
            console.log(embeds[0])
            if(embeds.length == 1 && embeds[0].image != null && embeds[0].image.url != null){
                let embed = embeds[0];
                let name = embed.author.name; //get name of rolled character
                if(embed.footer == null){
                    if(haveClaim && list.indexOf(name) != -1){
                        await driver.addReaction(message.id);
                    }
                }
                else if(!testRolls.test(embed.footer.text)){
                    
                    if(embed.footer.text.indexOf("Belongs to") != -1){
                        //claimed char claim kakera
                        console.log("Rolled claimed character, will attempt to react to kakera....")
                    }
                }
            }
            else if(message.content != ""){
                console.log(message.content);
                if(successfulClaim.test(message.content)){
                    console.log("Successfully claimed " +  message.content.substring(message.content.indexOf("and **") + 6, message.content.indexOf("** are")) + "!");
                    haveClaim = false;
                }
            }
           
        }

    }
})

client.on("messageReactionAdd",async reaction=>{
    let sad = await reaction.users.fetch();
    let users = sad.map((user)=>user.id);
    if(reaction.message.channelId == config.channelId && users.indexOf(config.mudaeID) != -1 &&  ( reaction.emoji.name.indexOf("💘") != -1 || reaction.emoji.name.indexOf("💖") != -1 || reaction.emoji.name.indexOf("💕") != -1 || reaction.emoji.name.indexOf("💓") != -1 ||reaction.emoji.name.indexOf("❤️") != -1 || reaction.emoji.name.indexOf("kakera") != -1)){
        message = reaction.message;
        let embeds  =  message.embeds
        if(embeds.length == 1 && embeds[0].image != null && embeds[0].image.url != null){
            let embed = embeds[0];
            let name = embed.author.name; //get name of rolled character
            if(embed.footer == null){
                if(haveClaim && list.indexOf(name) != -1){
                    await driver.getKakera(message.id);
                }
            }
            else if(!testRolls.test(embed.footer.text)){
                
                if(embed.footer.text.indexOf("Belongs to") != -1){
                    //claimed char claim kakera
                    await driver.getKakera(reaction.message.id);
                }
            }
        }
        else if(message.content != ""){
            console.log(message.content);
            if(successfulClaim.test(message.content)){
                console.log("Successfully claimed " +  message.content.substring(message.content.indexOf("and") + 3, message.content.indexOf(" are")) + "!");
            }
        }
    }
})

client.login(config.botToken);