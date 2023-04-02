const { client } = require('@xmpp/client');
const dnssd = require('dnssd');
const net = require('net');
const cheerio = require('cheerio');
const xml2js = require('xml2js');
const { parseMessage } = require('./xml-stream-parser')


const XMPP_CLIENT_PORT = 12345; // Replace with the desired port for your XMPP client

const messagesStacks = {};





// Advertise XMPP service using Bonjour/Zeroconf
const advertiseService = (port) => {
  const service = new dnssd.Advertisement(dnssd.tcp('presence'), port, {
    name: 'bot server',
    txt: { "1st": "Bot Server" }, // the display name
  });

  service.start();
  console.log(`Advertising XMPP service on port ${port}`);
  return service;
};

// Advertise the XMPP service
const advertisement = advertiseService(XMPP_CLIENT_PORT);





let responseSocket;
const getSocketForResponse = async (who) => {
  return new Promise((resolve, reject) => {
    // Browse for the service
    const browser = new dnssd.Browser(dnssd.tcp('presence'));

    browser.on('serviceUp', (service) => {
      console.log('Service found:', service);

      // Check if the service name matches the desired name
      if (service.name === who) {
        // Stop browsing when the desired service is found
        browser.stop();
        const socket = net.connect(service.port, service.addresses[0]);
        console.log(`connected to ${service.addresses[0]}:${service.port}`);
        resolve(socket);
      }
    });
    browser.start();
  });
};




// Set up a simple XMPP server
const server = net.createServer((socket) => {
  socket.on('connection', (stream) => console.log('CONNECTION', stream));

  socket.on('data', async (data) => {
    const str = data.toString();

    console.log('DATA', data.toString());

    const { message, stream } = parseMessage(data.toString());

    if (stream) {
      console.log('STREAM', stream);
      const streamResponse = `<stream:stream to="${stream.from}" from="${stream.to}" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`;
      console.log('STREAMRESP', streamResponse);
      responseSocket = await getSocketForResponse(stream.from);

      responseSocket.write('<?xml version="1.0" encoding="UTF-8" ?>');
      responseSocket.write(streamResponse);
      responseSocket.write(`<message from="${stream.to}" type="chat" to="${stream.from}"><body>TEST</body><html xmlns="http://www.w3.org/1999/xhtml"><body><div>TEST</div></body></html></message>`)
    }
    if (message) {
      console.log('MESSAGE', message);
      const messageResponse = `<message from="${message.to}" type="chat" to="${message.from}"><body>${message.body}</body><html xmlns="http://www.w3.org/1999/xhtml"><body><div>${message.html}</div></body></html></message>`;
      console.log('MESSAGERESP', messageResponse);
      // responseSocket = await getSocketForResponse(stream.from);
      responseSocket.write(messageResponse);
    }
  });
});

server.listen(XMPP_CLIENT_PORT, () => {
  console.log(`XMPP server listening on port ${XMPP_CLIENT_PORT}`);
});




// Cleanup on exit
process.on('SIGINT', () => {
  advertisement.stop();
  //   xmppClient.stop();
  server.close();
  process.exit();
});
