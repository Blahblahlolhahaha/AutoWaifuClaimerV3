const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const fs = require("fs");
const { send } = require('process');
const config = JSON.parse(fs.readFileSync("./config.json"))

class Browser{
    constructor(){
        this.options = new firefox.Options();
        this.options.headless();    
        this.driver = new webdriver.Builder()
        .forBrowser('firefox')
        .usingServer('http://localhost:4444/wd/hub')
        .setFirefoxOptions(this.options)
        .build();

        this.actions = this.driver.actions();
    }

    async connectToDiscordAndLogin(){
        try{
            await this.driver.get("https://discord.com/channels/" + config.serverID + "/" + config.channelID);
            let emailForm = await this.driver.findElement(webdriver.By.name("email"));
            let passwordForm = await this.driver.findElement(webdriver.By.name("password"));

            await emailForm.sendKeys(config.email);
            await passwordForm.sendKeys(config.password);

            await passwordForm.sendKeys(webdriver.Key.ENTER);
            


            await this.driver.wait(webdriver.until.elementsLocated(webdriver.By.className("form-3gdLxP")),10000);

            
            const username = await this.driver.findElement(webdriver.By.className("title-338goq")).getText();
            console.log("Login as " + username);
            // await this.driver.executeScript("document.body.style.zoom = '30%'")

            this.msgBox = await this.driver.findElement(webdriver.By.className("form-3gdLxP"));
        }catch(error){
            if(error instanceof webdriver.error.TimeoutError){
                console.log("Timeout waiting for driver to response")
            }
            else{
                console.log(error)
                console.log("An unknown error occured :(");
            }
            
        }
        
    }

    async sendMessage(message){
        this.actions.click(this.msgBox);
        this.actions.sendKeys(message)
        this.actions.sendKeys(webdriver.Key.ENTER);
        await this.actions.perform()
        this.actions.clear()
    }

    async addReaction(messageID){
        try{
            const emoji = "+" + config.emoji;
            this.sendMessage(emoji);
        }catch(error){
            console.log(error)
        }
        
    }

    async getKakera(messageID){
        try{
            let messagesList = await this.driver.findElement(webdriver.By.id("chat-messages-" + messageID));
            await this.actions.move(messagesList).perform();
            this.actions.clear()
            let reaction = await messagesList.findElements(webdriver.By.className("reaction-2A2y9y"));
            await reaction[0].click();
        }catch(error){
            console.log(error)
        }
    }

}

module.exports = Browser