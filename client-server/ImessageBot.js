import Bot from './Bot.js';
import _ from 'lodash';
import { lastActivityForUser } from './adminTasks.js';
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
        this.messageIds = new Set();
        this.lastActivity = new Date(0);
        this.readyToUpdateMessages = new Promise(resolve => this._resolveReadyToUpdateMessages = resolve);

        this.recentlySentMessages = new Set();
    }

    async initialize() {
        lastActivityForUser(this.botName)
            .then(lastActivity => {
                this.lastActivity = lastActivity;
                this._resolveReadyToUpdateMessages();
                delete this._resolveReadyToUpdateMessages;
            })
            .then(() => this.updateMessages(this.messages, true))
            .then(() => {
                this.messages.forEach(message => this.messageIds.add(message.ROWID));
            });
    }

    async updateMessages(messages = this.messages, isFirstUpdate = true) {
        await this.readyToUpdateMessages;
        // const newMessages = messages.filter(
        //     message => !this.messageIds.has(message.ROWID) && message.date > this.lastActivity
        // );

        for (const message of messages) {
            await this.handleImessage(message.text, message.is_from_me === 1, isFirstUpdate);
        }
    }

    // a new message has come in from imessage
    async handleImessage(text, isFromMe, isFirstUpdate) {
        // if we recently sent this message, assume it's an echo of the one we proxied from xmpp,
        // so we should filter it out
        if (this.recentlySentMessages.has(text)) {
            this.recentlySentMessages.delete(text);
            return;
        }

        const body = isFirstUpdate ? `${isFromMe ? 'You' : this.displayName}: ${text}` : text;
        // forward it to xmpp!
        this.sendMessage('joe@dockerpi.local', body);
    }

    // a new message has come in from an xmpp contact
    async handleMessage(from, message) {
        // add it to set of recently sent messages so we can filter the corresponding message coming back from imessage
        this.recentlySentMessages.add(message);

        // forward it to imessage!
        await sendiMessage(this.guid, message);
    }
}