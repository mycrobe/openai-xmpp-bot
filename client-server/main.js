import { EchoBot } from './bot.js';

// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const joe = new EchoBot({ username: "joe", password: "password" });
joe.start();

const admin = new EchoBot({ username: "admin", password: "password" });
admin.start();

await admin.subscribe(joe.account);
await joe.subscribe(admin.account);

await admin.sendMessage('joe@dockerpi.local', 'testy test3');
