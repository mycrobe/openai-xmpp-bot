import * as OpenAI from 'openai';

const PORT = parseInt(process.env.GPT_BOT_PORT, 10);
const KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI.OpenAIApi(new OpenAI.Configuration({ apiKey: KEY }));

export default class GptChat {
    constructor(callback) {
        this.messageHistory = [];
        this.callback = callback || console.log;
    }

    resetMessages() {
        this.messageHistory = [{ "role": "system", "content": "You are a helpful assistant." }];
    }

    getMessages() {
        if (!this.messageHistory.length) {
            this.resetMessages();
        }

        return this.messageHistory;
    }

    newMessage (content) {
        return { "role": "user", "content": content };
    }

    async sendMessageToGpt(content) {
        const message = this.newMessage(content);
        this.messageHistory.push(message);

        try {
            const completion = await openai.createChatCompletion({
                model: process.env.GPT_MODEL,
                messages: this.messages,
                temperature: 0.5,
            });
    
            const responseMessage = { "role": "system", "content": completion.data.choices[0]?.message?.content };
            this.messages.push(responseMessage);
            this.callback(responseMessage.content);
        } catch (error) {
            if (error.response) {
                console.log(error.response.status);
                console.log(error.response.data);
                callback(`We got a ${error.response.status} error from OpenAI with message ${error.response.data?.error?.message}}}`);
            } else {
                console.log(error.message);
                callback(recipient, ADVERTISED_NAME, error.message);
            }
        }

    }
}