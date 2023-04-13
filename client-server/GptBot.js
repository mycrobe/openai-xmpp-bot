import Bot from './Bot.js';
import GptChat from './GptChat.js';

export default class GptBot extends Bot {
    constructor(args) {
        super(args);
        
        this.chats = {};
    }

    getChat(from) {
        if (!this.chats[from]) {
            this.chats[from] = new GptChat((message) => {
                this.sendMessage(from, message);
            });
        }
        return this.chats[from];
    }

    async handleMessage(from, message) {
        if(message === 'reset') {
            delete this.chats[from];
            this.sendMessage(from, 'All is forgotten!');
            return;
        }

        const response = await this.getChat(from).sendMessageToGpt(message);
        this.sendMessage(from, response);
    }
}