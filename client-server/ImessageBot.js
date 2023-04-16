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
        this.sendMessage('joe@dockerpi.local', body);
    }

    static getMessageTextPrefix(text, date, isFromMe, doingRecap) {
        const isTapback = !!text.match(/^(Loved|Liked|Disliked|Emphasized|Questioned|Laughed at) [“].*[”]$/);
        let prefix = '';

        // make clear an incoming message is actually from you during a recap
        if (doingRecap) {
            const dateString = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
            prefix = `(${dateString}): `;
            if (isFromMe) {
                prefix = `You ${prefix}`;
            }
            else if (isTapback) {
                prefix = `They ${prefix}`;
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