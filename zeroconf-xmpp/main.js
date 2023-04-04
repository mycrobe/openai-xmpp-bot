import * as dotenv from 'dotenv';
dotenv.config();

import advertiseService from "./advertiseService.js";
import createServer from "./listenForMessages.js";

const bots = [
    await import("./gpt35.js"),
]

const toCleanup = bots.map(botImport => {
    const bot = botImport.default();
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
    return { advertisement, server };
})

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('Cleaning up...');
    toCleanup.forEach(({ advertisement, server }) => {
        advertisement.stop();
        server.close();
    });
    process.exit();
});
