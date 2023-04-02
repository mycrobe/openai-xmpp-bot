const { client } = require('@xmpp/client');
const dnssd = require('dnssd');
const net = require('net');

// Extract the desired service name from the "from" field in the <stream:stream> message
const from = "mulvaney@petal"; // Replace with the actual "from" value

const botAvahiName = 'test_thing';
const botDisplayName = 'test thing';

const XMPP_CLIENT_PORT = 12345; // Replace with the desired port for your XMPP client

// Advertise XMPP service using Bonjour/Zeroconf
const advertiseService = (port) => {
  const service = new dnssd.Advertisement(dnssd.tcp('presence'), port, {
    name: botAvahiName, // the service name
    txt: { "1st": botDisplayName }, // the display name
  });

  service.start();
  console.log(`Advertising XMPP service on port ${port}`);
  return service;
};

// Advertise the XMPP service
const advertisement = advertiseService(XMPP_CLIENT_PORT);


const getUrlForResponse = async (who) => {
  return new Promise((resolve, reject) => {
    // Browse for the service
    const browser = new dnssd.Browser(dnssd.tcp('presence'));

    browser.on('serviceUp', (service) => {
      console.log('Service found:', service);

      // Check if the service name matches the desired name
      if (service.name === who) {
        // Stop browsing when the desired service is found
      //  browser.stop();
        resolve({ url: service.addresses[0], port: service.port });
      }
    });
    browser.start();
  });
}

const main = async () => {
  const urlBits = await getUrlForResponse(from);
  const socket = net.connect(urlBits.port, urlBits.url);
  console.log(`Connected to service at ${urlBits.url}:${urlBits.port}`);
  socket.write('<?xml version="1.0" encoding="UTF-8" ?>');
  socket.write(`<stream:stream to="mulvaney@bragg" from="test thing" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">`);
  socket.write(`<message from="test thing" type="chat" to="mulvaney@bragg"><body>why hello there</body><html xmlns="http://www.w3.org/1999/xhtml"><body><div><b>why hello there</b></div></body></html></message>`);
};

main();
