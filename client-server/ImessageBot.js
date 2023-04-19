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
        this.participants = args.participants;

        this.recentlySentMessages = new Set();
    }

    async initialize() {
        this.setFullname(this.displayName);
        this.followJoe();
    }

    async followJoe() {
        await this.isInitialized;
        await this.gotRoster;

        if (!(this.roster.includes('joe@dockerpi.local') || this.id.match(/^chat\d+$/))) {
            this.presenceSubscribe('joe@dockerpi.local');
            this.sendMessage('joe@dockerpi.local', 'Hi! I\'m a bot that proxies your iMessages. IMPORTANT! Anything you reply to me will go to the recipient of this conversation.');
        }
    }

    async updateMessages(messages = [], doingRecap = false) {
        await this.isInitialized;

        for (const message of messages) {
            await this.handleImessage(message, doingRecap);
        }

        // keep the last 5 messages for recap
        this.messages.push(...messages);
        this.messages = _.takeRight(this.messages, 5);
    }

    // a new message has come in from imessage
    async handleImessage(message, doingRecap = false) {
        const { text } = message;

        if (text === null) {
            this._log('ignoring message with `null` text', message);
            return;
        }

        // if we recently sent this message, assume it's an echo of the one we proxied from xmpp,
        // so we should filter it out
        if (this.recentlySentMessages.has(text)) {
            this.recentlySentMessages.delete(text);
            return;
        }

        const prefix = ImessageBot.getMessageTextPrefix(message, doingRecap);

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

    static getMessageTextPrefix(message, doingRecap) {
        const { chat_identifier, display_name, text, date, is_from_me } = message;
        const isMultiuserChat = chat_identifier.match(/^chat\d+$/);
        const isTapback = !!text.match(/^(Loved|Liked|Disliked|Emphasized|Questioned|Laughed at) [“].*[”]$/);
        const dateString = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        
        if (isMultiuserChat) {
            if (doingRecap) {
                return `${dateString} -- ${display_name}: `
            }
            else {
                return `${display_name}: `;
            }
        }

        // make clear an incoming message is actually from you during a recap
        else if (doingRecap) {
            if (is_from_me) {
                return `${dateString} -- You: `;
            }
            else if (isTapback) {
                return `${dateString} -- They: `;
            }
            else {
                return dateString + ': ';
            }
        }

        // handle when i send iMessage from actual Messages client, and it comes over the wire to xmpp client
        // TODO make this work if another client on same XMPP account sends a message. Currently they are not
        // visible.
        else if (is_from_me) {
            return 'You: ';
        }

        // always do tapbacks
        else if (isTapback) {
            return is_from_me ? 'You ' : 'They ';
        }

        return '';
    }

    // a new message has come in from an xmpp contact
    async handleMessage(from, message) {
        if (message === 'recap') {
            console.log("recapping")
            await this.updateMessages(this.messages, true);
            return;
        }

        else if (message === 'who') {
            this.sendMessage(from, `${this.participants.map(p => p.name).join(', ')}`);
            return;
        }

        // add it to set of recently sent messages so we can filter the corresponding message coming back from imessage
        this.recentlySentMessages.add(message);

        // forward it to imessage!
        try {
            await sendiMessage(this.guid, message);
        }
        catch (e) {
            this.sendMessage(from, `Error sending message: ${e.message}`);
        }
    }

    async updateStatus() {
        await this.isInitialized;
        
        const hoursSinceLastMessage = (Date.now() - this.mostRecentMessageDate) / 1000 / 60 / 60;
        let show;
        let status;
        if (hoursSinceLastMessage > 24) {
            show = 'xa';
            const days = Math.floor(hoursSinceLastMessage / 24);
            if (days < 2) {
                status = `Last message ${Math.floor(hoursSinceLastMessage)} hours ago`
            }
            else {
                status = `Last message ${days} days ago`;
            }
        }
        else if (hoursSinceLastMessage > 1) {
            show = 'away';
            status = `Last message ${Math.floor(hoursSinceLastMessage)} hours ago`;
        }
        else {
            show = 'chat';
            status = `Last message ${Math.floor(hoursSinceLastMessage * 60)} minutes ago`;
        }
       
        this.setStatus(show, status);
    }
}