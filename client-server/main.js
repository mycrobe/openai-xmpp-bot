import * as dotenv from 'dotenv';
dotenv.config();

import Bot, { EchoBot } from './Bot.js';
import GptBot from './GptBot.js';
import imessageManager from './ImessageManager.js';

// const gpt = await Bot.forUser('gpt', GptBot);

imessageManager.start();
const conversations = await imessageManager.getConversations();


// imessageManager.stop();
// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// const joe = new EchoBot({ username: "joe", password: "password" });
// joe.start();

// const admin = new AdminBot({ username: "admin", password: "password" });
// admin.start();

// await admin.subscribe(joe.account);
// await joe.subscribe(admin.account);

// await admin.createNewAccount("gpt", "password");
// const gpt = new GptBot({ username: "gpt", password: "password" });


// joe.subscribe(gpt.account);
// gpt.subscribe(joe.account);





// const testBot = await botForNewUser('test24');
// Promise.all([
//     // testBot.iqSubscribe('joe@dockerpi.local'), 
//     // testBot.presenceSubscribe('joe@dockerpi.local'), 
//     // testBot.sendMessage('joe@dockerpi.local', 'fucksticks')
// ]);

// const users = await Promise.all(['alice', 'bob', 'charlie', 'dave', 'eve', 'fred'].map(botForNewUser));

// users.map(async user => user.sendMessage(joe.account, `hi from ${user.account}`));

// await admin.sendMessage(joe.account, 'testy test3');

// const gptChat = new GptChat((message) => {
//     console.log(message);
// });
// await gptChat.sendMessageToGpt('briefly summarize the plot of Shakespeare\s Twelfth Night in the style of The Sun newspaper');dds