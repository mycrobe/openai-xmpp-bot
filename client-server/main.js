import Bot from './bot.js';

// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const joe = new Bot({
    password: "password", 
    username: "joe",
    handleMessage: (message) => {
        console.log(message.from, message.body);
    }
});
joe.start();

const admin = new Bot({
    password: "password", 
    username: "admin",
    handleMessage: (message) => {
        admin.sendMessage(message.from, message.body);
    }
}); 
admin.start();

await admin.subscribe(joe.account);
await joe.subscribe(admin.account);

await admin.sendMessage('joe@dockerpi.local', 'testy test3');
