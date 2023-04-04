import advertiseService from "./advertiseService.js";
import createServer from "./listenForMessages.js";
import sendMessage from "./sendMessage.js";

const PORT = 12345;
const advertisement = advertiseService({ port: PORT, advertisedName: 'nodebot', displayName: 'Node Bot' });
const server = createServer(PORT,
    async (message) => await sendMessage(message.from, message.body),
    async (composing) => console.log('COMPOSING', composing)
);


// Cleanup on exit
process.on('SIGINT', () => {
    console.log('Cleaning up...');
    advertisement.stop();
    server.close();
    process.exit();
});
