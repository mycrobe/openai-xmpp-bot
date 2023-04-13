import * as OpenAI from 'openai';


export default class GptChat {
    constructor(callback) {
        this.openai = new OpenAI.OpenAIApi(new OpenAI.Configuration({ apiKey: process.env.OPENAI_API_KEY }));

        this.messageHistory = [{ "role": "system", "content": "You are a helpful assistant." }];
        this.callback = callback || console.log;
    }

    static newMessage (content, role = "user") {
        return { "role": role, "content": content };
    }

    async sendMessageToGpt(content) {
        const message = GptChat.newMessage(content);
        this.messageHistory.push(message);

        try {
            const completion = await this.openai.createChatCompletion({
                model: process.env.GPT_MODEL,
                messages: this.messageHistory,
                temperature: 0.5,
            });
    
            const responseMessage = GptChat.newMessage(completion.data.choices[0]?.message?.content, "system");
            this.messageHistory.push(responseMessage);
            this.callback(responseMessage.content);
            
        } catch (error) {
            if (error.response) {
                console.log(error.response.status);
                console.log(error.response.data);
                this.callback(`We got a ${error.response.status} error from OpenAI with message ${error.response.data?.error?.message}}}`);
            } else {
                console.log(error.message);
                this.callback(error.message);
            }
        }

    }
}