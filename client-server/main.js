import * as dotenv from 'dotenv';
dotenv.config();

import Bot, { EchoBot } from './Bot.js';
import GptBot from './GptBot.js';
import imessageManager from './ImessageManager.js';

const gpt = await Bot.forUser('gpt35', GptBot);
await gpt.setFullname('GPT 3.5 Turbo');
await gpt.presenceSubscribe('joe@dockerpi.local');

imessageManager.start();
const conversations = await imessageManager.getConversations();
