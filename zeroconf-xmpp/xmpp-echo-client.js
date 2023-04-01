const { client } = require('@xmpp/client');
const dnssd = require('dnssd');
const net = require('net');
const cheerio = require('cheerio');
const xml2js = require('xml2js');
const { parseMessage } = require('./xml-stream-parser')


const XMPP_CLIENT_PORT = 12345; // Replace with the desired port for your XMPP client

// Advertise XMPP service using Bonjour/Zeroconf
const advertiseService = (port) => {
  const service = new dnssd.Advertisement(dnssd.tcp('presence'), port, {
    name: 'Test XMPP Server',
  });

  service.start();
  console.log(`Advertising XMPP service on port ${port}`);
  return service;
};

// // Initialize XMPP client
// const xmppClient = client({
//   service: `xmpp://localhost:${XMPP_CLIENT_PORT}`,
//   domain: 'localhost',
//   resource: 'echo',
//   username: 'echo',
//   password: 'password', // Set a password for the echo client
// });

// // Handle incoming messages
// xmppClient.on('stanza', (stanza) => {
//   if (stanza.is('message') && stanza.attrs.type === 'chat') {
//     const from = stanza.attrs.from;
//     const body = stanza.getChildText('body');
//     console.log(`Received message from ${from}: ${body}`);
//   }
// });

// Start the XMPP client
// xmppClient.start().catch(console.error);

// Set up a simple XMPP server
const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const str = data.toString();
    
    console.log('DATA', data.toString());

    const { message, stream } = parseMessage(data.toString());

    if (message) console.log('MESSAGE', message);
    if (stream) console.log('STREAM', stream);
  });
});

server.listen(XMPP_CLIENT_PORT, () => {
  console.log(`XMPP server listening on port ${XMPP_CLIENT_PORT}`);
});

// Advertise the XMPP service
const advertisement = advertiseService(XMPP_CLIENT_PORT);

// Cleanup on exit
process.on('SIGINT', () => {
  advertisement.stop();
//   xmppClient.stop();
  server.close();
  process.exit();
});
