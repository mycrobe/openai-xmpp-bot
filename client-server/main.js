import * as dotenv from 'dotenv';
dotenv.config();

import Bot, { EchoBot } from './Bot.js';
import GptBot from './GptBot.js';
import imessageManager from './ImessageManager.js';

const gpt = await Bot.forUser('gpt', GptBot);

imessageManager.start();
const conversations = await imessageManager.getConversations();
