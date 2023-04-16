import Bot from './Bot.js';
import _ from 'lodash';
import sendiMessage from './sendiMessage.js';

export default class ImessageBot extends Bot {
    static async forUser(...args) {
        const bot = await super.forUser(...args);
        await bot.initialize();
        return bot;
    }

    constructor(args) {
        super(args);

        this.guid = args.guid;
        this.botName = args.botName;
        this.messages = args.messages;
        this.displayName = args.display_name;
        this.mostRecentMessageDate = args.latest_message;

        this.recentlySentMessages = new Set();
    }

    async initialize() {
        this.setFullname(this.displayName);
    }

    async updateMessages(messages = [], doingRecap = false) {
        await this.isInitialized;

        for (const message of messages) {
            await this.handleImessage(message.text, message.date, message.is_from_me === 1, doingRecap);
        }

        // keep the last 5 messages for recap
        this.messages.push(...messages);
        this.messages = _.takeRight(this.messages, 5);
    }

    // a new message has come in from imessage
    async handleImessage(text, date, isFromMe, doingRecap = false) {
        // if we recently sent this message, assume it's an echo of the one we proxied from xmpp,
        // so we should filter it out
        if (this.recentlySentMessages.has(text)) {
            this.recentlySentMessages.delete(text);
            return;
        }

        const prefix = ImessageBot.getMessageTextPrefix(text, date, isFromMe, doingRecap);

        const body = `${prefix}${text}`;

        // forward it to xmpp!
        this.sendMessage('joe@dockerpi.local', body); // this only seems to go to one connected client

        // here's an experiment where we send it to both explicitly. There's an xmpp stanza that should
        // return in a iq response with the list of connected clients. 

        // this.sendMessage('joe@dockerpi.local/bragg', body);
        // this.sendMessage('joe@dockerpi.local/petal', body);

        // I asked chat gpt how to get the list of connected clients, and they said:

        /*

        Yes, you can use the XMPP stanza to retrieve information about the active client sessions for a 
        given account name in ejabberd. To do this, you can use the XMPP Disco Items protocol to retrieve 
        a list of all active sessions for a given account. Here's an example of how you can do this:

        To specify the user of interest whose active sessions you want to retrieve, you need to replace
        user in the jid attribute of the XMPP Disco Items request with the actual JID of the user whose
        sessions you want to retrieve. Here's an updated example XMPP stanza with the jid attribute set
        to the JID of the user example@domain.com:

<iq type='get' id='disco1' to='domain.com' xmlns='jabber:client'>
  <query xmlns='http://jabber.org/protocol/disco#items' node='http://jabber.org/protocol/commands'/>
  <item jid='example@domain.com' />
</iq>

        Replace domain.com with the actual domain name of your ejabberd server. This request will return
        a list of all active sessions for the user example@domain.com. Note that the node attribute is
        not strictly necessary for this request, so you can omit it if you prefer.

        The XMPP server will respond to the XMPP Disco Items request with an IQ stanza containing a list
        of all active sessions for the specified user. Here's an example of what the response stanza might
        look like:

<iq type='result' id='disco1' from='domain.com' xmlns='jabber:client'>
  <query xmlns='http://jabber.org/protocol/disco#items'>
    <item jid='example@domain.com/12345' node='http://jabber.org/protocol/commands'/>
    <item jid='example@domain.com/67890' node='http://jabber.org/protocol/commands'/>
  </query>
</iq>

        */
    }

    static getMessageTextPrefix(text, date, isFromMe, doingRecap) {
        const isTapback = !!text.match(/^(Loved|Liked|Disliked|Emphasized|Questioned|Laughed at) [“].*[”]$/);
        let prefix = '';

        // make clear an incoming message is actually from you during a recap
        if (doingRecap) {
            const dateString = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
            if (isFromMe) {
                prefix = `${dateString} -- You: `;
            }
            else if (isTapback) {
                prefix = `${dateString} -- They: `;
            }
            else {
                prefix = dateString + ': ';
            }
        }

        // always do tapbacks
        else if (isTapback) {
            prefix = isFromMe ? 'You ' : 'They ';
        }

        return prefix;
    }

    // a new message has come in from an xmpp contact
    async handleMessage(from, message) {
        if (message === 'recap') {
            console.log("recapping")
            await this.updateMessages(this.messages, true);
            return;
        }

        // add it to set of recently sent messages so we can filter the corresponding message coming back from imessage
        this.recentlySentMessages.add(message);

        // forward it to imessage!
        await sendiMessage(this.guid, message);
    }
}