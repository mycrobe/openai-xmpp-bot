import { monitorForChanges, getConversations } from "./imessageDatabaseBridge.js";
import { createIfNew } from "./adminTasks.js";
import Bot from './Bot.js';
import ImessageBot from './ImessageBot.js';
import _ from 'lodash';

class ImessageManager {
    constructor() {
        this.bots = {};
        this.conversations = {};
        this.sortedGuids = [];
        this.mostRecentRecievedAt = new Date(0);
        this.monitor = null;
        this.didInitialize = new Promise(resolve => this._resolveInitialized = resolve);
    }

    async start() {
        this.monitor = await monitorForChanges(this.handleChange.bind(this));
    }

    async stop() {
        clearInterval(this.monitor);
    }

    async handleChange(since) {
        const { sortedGuids, conversations, mostRecentRecievedAt } = await getConversations(since);
        this.conversations = conversations;

        // if it's the first time this is called, truncate the messages of all conversations to the last 5
        // (we can tell if it's the first time because this._resolveInitialized will exist. Note we delete it below)
        if (this._resolveInitialized) {
            for (const guid of sortedGuids) {
                this.conversations[guid].messages = _.takeRight(this.conversations[guid]?.messages, 5);
            }
        }

        this.sortedGuids = sortedGuids;
        if (mostRecentRecievedAt) {
            this.mostRecentRecievedAt = mostRecentRecievedAt;
        }

        if (this._resolveInitialized) {
            this._resolveInitialized();
            delete this._resolveInitialized;
        }

        await this.updateBots();
    }

    async updateBots() {
        await this.didInitialize;
        for await (const guid of this.sortedGuids) {
            const { messages, displayName, participants } = this.conversations[guid];

            const botName = ImessageManager.getBotName(guid);
            if (!this.bots[guid]) {
                await createIfNew(botName);
                const newBot = await ImessageBot.forUser(
                    botName,
                    ImessageBot,
                    { guid, botName, messages, displayName, participants }
                );
                this.bots[guid] = newBot;
            }
            else {
                const bot = this.bots[guid];
                bot.updateMessages(messages, false);
            }
        }
    }

    async getConversation(guid) {
        await this.didInitialize;
        return this.conversations[guid];
    }

    async getConversations() {
        await this.didInitialize;
        return this.sortedGuids.map(guid => ({ ...this.conversations[guid], guid }));
    }

    static getBotName(guid) {
        // iMessage ids are of the form "iMessage;-;+14155094023"
        // We want to remove the "iMessage;-;+" part
        return _.first(guid.split(';').slice(2))?.replaceAll('@', '_at_');
    }
}

export default new ImessageManager();