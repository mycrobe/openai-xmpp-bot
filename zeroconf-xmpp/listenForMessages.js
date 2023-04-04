// Set up a simple XMPP server
import net from 'net';
import parseMessages from './messageParser.js'

const createServer = (port = 12345, onMessage = console.log, onComposing = console.warn) => {
    const server = net.createServer((socket) => {
        socket.on('data', async (data) => {
            const str = data.toString();
            const messages = parseMessages(data.toString());

            messages.forEach((message) => {
                if (message) {
                    if (message.type === 'chat') {
                        onMessage(message, message.from);
                    }
                    else if (message.type === 'composing') {
                        onComposing(message.composing, message.from);
                    }
                }
            });
        });
    });

    server.listen(port, () => {
        console.log(`XMPP server listening on port ${port}`);
    });

    return server;
}

export default createServer;