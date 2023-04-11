import * as dotenv from 'dotenv';
dotenv.config();

import { setIgnoreList } from './dnssdBrowser.js';
import advertiseService from "./advertiseService.js";
import createServer from "./listenForMessages.js";

// who are the bots?
const bots = [
    await (await import("./gpt35.js")).default(),
    await (await import("./imessageBots.js")).default(),
];

setIgnoreList(bots.map((bot) => bot.advertiseName));

// stert the bots!
const toCleanup = [];
for await (const bot of bots) {
    // const bot = await botImport.default();
    const advertisement = advertiseService({
        port: bot.port,
        advertisedName: bot.advertiseName,
        displayName: bot.displayName
    });
    const server = createServer(
        bot.port,
        bot.handleMessage,
        bot.handleComposing
    );
    toCleanup.push({ advertisement, server });
}

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('Cleaning up...');
    toCleanup.forEach(({ advertisement, server }) => {
        advertisement.stop();
        server.close();
    });
    process.exit();
});
