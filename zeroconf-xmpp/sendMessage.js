/*
This is a simple script to send an XMPP message to a user on the local network.

The program accepts two arguments: the user to send the message to, and the message to send.

The script will first query for a service on the local network with the name of the user to
send the message to. If the service is found, the script will connect to the service and send the message.

Currently the plan is to:
 1. Open a stream to the user's service
 2. Send the message
 3. Close the stream again

This is not idiomatic for XMPP, but it's the simplest way to get something working.
*/

import dnssd from 'dnssd';
import net from 'net';

const XMPP_CLIENT_PORT = 12345; // Replace with the desired port for your XMPP client

const botAvahiName = 'nodebot';
const botDisplayName = 'Node Bot';

/**
 * This cache is to work around dnssd sometimes not returning the ipv4 ip address.
 */
const cache = {};

const getUrlForResponse = async (who) => {
    if (cache[who]) {
        return cache[who];
    }

    return new Promise((resolve) => {
        // Browse for the service
        const browser = new dnssd.Browser(dnssd.tcp('presence'));
        
        browser.on('serviceUp', (service) => {
            // Check if the service name matches the desired name
            if (service.name === who && service.addresses.find((address) => address.match(/192\.168\./))) {
                const result = { url: service.addresses[0], port: service.port };
                cache[who] = result;
                resolve(result);
                browser.stop();
                return false;
            }
        });
        browser.start();
    });
}

const sendMessage = async (to, message) => {
    const urlBits = await getUrlForResponse(to);
    console.log(`Sending message to ${to}: ${message} at ${urlBits.url}:${urlBits.port}`);
    const socket = net.connect(urlBits.port, urlBits.url);
    socket.write(
`<?xml version="1.0" encoding="UTF-8" ?>
<stream:stream to="mulvaney@bragg" from="test thing" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">
<message from="test thing" type="chat" to="mulvaney@bragg"><body>${message}</body><html xmlns="http://www.w3.org/1999/xhtml"><body><div><b>${message}</b></div></body></html></message>
</stream:stream>`,
        () => {
            socket.unref();
            socket.end();
        });
};

export default sendMessage;