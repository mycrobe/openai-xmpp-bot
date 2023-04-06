import sendMessage from "./sendMessage.js";
import * as OpenAI from 'openai';

const port = parseInt(process.env.GPT_BOT_PORT, 10);
const key = process.env.OPENAI_API_KEY;

const ADVERTISED_NAME = 'gpt35';
const DISPLAY_NAME = 'GPT-3.5';

const openai = new OpenAI.OpenAIApi(new OpenAI.Configuration({ apiKey: key }));

const messageHistory = {};

const resetMessages = (recipient) => {
    messageHistory[recipient] = [{ "role": "system", "content": "You are a helpful assistant." }];
}

const getMessages = (recipient) => {
    if (!messageHistory[recipient]) {
        resetMessages(recipient);
    }
    return messageHistory[recipient];
}

const newMessage = (message) => {
    return { "role": "user", "content": message.body };
}

const handleMessage = async (message, recipient) => {
    if (message.body === 'reset') {
        resetMessages(recipient);
        sendMessage(recipient, ADVERTISED_NAME, "All is forgotten!");
        return;
    }

    const messages = getMessages(recipient, message.body);
    messages.push(newMessage(message));
    try {
        const completion = await openai.createChatCompletion({
            model: process.env.GPT_MODEL,
            messages: messages,
            temperature: 0.5,
        });

        const responseMessage = { "role": "system", "content": completion.data.choices[0]?.message?.content };
        messages.push(responseMessage);
        sendMessage(recipient, ADVERTISED_NAME, responseMessage.content);
    } catch (error) {
        if (error.response) {
            console.log(error.response.status);
            console.log(error.response.data);
            sendMessage(recipient, ADVERTISED_NAME, `We got a ${error.response.status} error from OpenAI with message ${error.response.data?.error?.message}}}`);
        } else {
            console.log(error.message);
            sendMessage(recipient, ADVERTISED_NAME, error.message);
        }
    }
}

export default async () => ({
    port,
    advertiseName: ADVERTISED_NAME,
    displayName: DISPLAY_NAME,
    handleMessage,
    handleComposing: async (composing) => { /* ignored */ },
});