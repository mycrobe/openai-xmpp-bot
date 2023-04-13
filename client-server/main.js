import * as dotenv from 'dotenv';
dotenv.config();

import { EchoBot, AdminBot } from './bot.js';

// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const joe = new EchoBot({ username: "joe", password: "password" });
joe.start();

const admin = new AdminBot({ username: "admin", password: "password" });
admin.start();

await admin.subscribe(joe.account);
await joe.subscribe(admin.account);

await admin.createNewAccount("alice", "password");
const alice = new EchoBot({ username: "alice", password: "password" });
alice.start();

joe.subscribe(alice.account);

await admin.sendMessage('joe@dockerpi.local', 'testy test3');
