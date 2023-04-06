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
import _ from 'lodash';
import dnssd from 'dnssd';
import net from 'net';
import { getAllServices, getServiceByName } from './dnssdBrowser.js';

const XMPP_CLIENT_PORT = 12345; // Replace with the desired port for your XMPP client

const botAvahiName = 'nodebot';
const botDisplayName = 'Node Bot';

const formatMessageForBody = (message) => {
    return encodeURIComponent(message);
}

const formatMessageForHtml = (message) => {
    return message
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&apos;')
        .replaceAll('\n', '<br />\n')
        .replaceAll('`', '@')
        .replaceAll(new RegExp('[@]+(.[^@]+)[@]+', 'mg'), '<span style="font-family: Courier New; font-size: 12px;">$1</span>');
}

const _sendMessage = async (urlBits, to, from, message) => {
    console.log(`Sending message from ${from} to ${to}: ${message} at ${urlBits.url}:${urlBits.port}`);
    const socket = net.connect(urlBits.port, urlBits.url);
    const messageString = `<?xml version="1.0" encoding="UTF-8" ?>
    <stream:stream to="${to}" from="${from}" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">
    <message from="${from}" type="chat" to="${to}"><body>${formatMessageForBody(message)}</body><html xmlns="http://www.w3.org/1999/xhtml"><body><div><b>${formatMessageForHtml(message)}</b></div></body></html></message>
    </stream:stream>`
    console.debug(messageString);
    socket.write(messageString
        ,
        () => {
            socket.unref();
            socket.end();
        });
}

const sendMessage = async (to, from, message) => {
    _sendMessage(await getServiceByName(to), to, from, message);
};

export const broadcastMessage = async (from, message, filter = _.identity) => {
    const allServices = await getAllServices();
    const filtered = _.filter(allServices, filter);
    for await (const target of filtered) {
        await _sendMessage(target, target.to, from, message);
    }
};

// setInterval(async () => {
//     await broadcastMessage(
//         'gpt35', 
//         'hi!', 
//         (thing) => thing.to.indexOf('@') > -1),
//     10000
// });

export default sendMessage;