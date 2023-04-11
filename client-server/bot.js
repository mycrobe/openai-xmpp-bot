import { client, xml } from "@xmpp/client";
import debug from "@xmpp/debug";

export const defaults = Object.freeze({
    name: "Bot",
    id: "bot",
    url: "xmpp://dockerpi.local:5222",
    username: "admin",
    password: "password",
    handleMessage: console.log,
});

export default class Bot {
    constructor(args) {
        const { name, id, url, username, password, handleMessage } = { ...defaults, ...args };

        this.name = name;
        this.id = id;
        this.handleMessage = handleMessage;

        this.initXmpp({ url, username, password });
    }

    async sendMessage(to, body) {
        const message = xml(
            "message",
            { type: "chat", to: to },
            xml("body", {}, body),
        );
        await this.xmpp.send(message);
    }

    initXmpp({ url, username, password }) {
        this.xmpp = client({
            service: url,
            domain: "dockerpi.local",
            resource: "example",
            username: username,
            password: password,
        });

        this.xmpp.on("error", (err) => {
            throw err;
        });

        this.xmpp.on("online", async (address) => {
            console.log(`${this.id} online at ${address}`);

            //   Makes itself available
            const presence = xml("presence");
            await this.xmpp.send(presence);
        });

        this.xmpp.on("stanza", async (stanza) => {
            if (stanza.is('message')) {
                const { from, to } = stanza.attrs;
                if (this.jid.indexOf(to) !== 0) {
                    throw new Error(`Received message for ${to} but I am ${this.xmpp.jid}`);
                }

                // work out what type of message this is, based on chatstate and body
                const type = Bot.getMessageType(stanza);
                if (type !== 'message') {
                    console.log(`Received ${type} from ${from}`);
                    return;
                }

                const body = stanza.getChild('body')?.text();
                console.log(`Received message from ${from}: ${body}`);

                this.handleMessage({ from, body });
            }

            else if (stanza.is('iq')) {
                const jid = stanza.getChild('bind')?.getChild('jid')?.text();
                console.log(`Received iq: I am ${jid}`);
                if (jid) {
                    if (this.jid && this.jid !== jid) {
                        throw new Error(`Received jid ${jid} from an iq but I am ${this.jid}`);
                    }
                    this.jid = jid;
                }
            }

            else if (stanza.is('presence')) {
                const from = stanza.attr('from');
                const presence = Bot.getPresence(stanza);
                console.log('presence', { from, presence });
            }
            
            else {
                console.log(`Received stanza: ${stanza.name}`);
            }
        });
    }

    start() {
        this.xmpp.start();
    }

    stop() {
        this.xmpp.stop();
    }

    static getPresence(stanza) {
        const isConnected = stanza.attr('type') !== 'unavailable';
        const statusMessage = stanza.getChild('status')?.text() || '';
        const show = stanza.getChild('show')?.text();

        if (show) {
            // this appears to be implicit and might be Adium-specific
            if (show === 'away' && statusMessage === '') {
                return 'invisible';
            }

            return show;
        }
        else if (isConnected) {
            return 'available';
        }

        return 'offline';

    }

    static getMessageType(stanza) {
        const state = stanza.getChildByAttr('xmlns', 'http://jabber.org/protocol/chatstates')?.name;
        const body = stanza.getChild('body')?.text();

        if (state != 'active' || !body) {
            return state;
        }

        return 'message';

    }
}