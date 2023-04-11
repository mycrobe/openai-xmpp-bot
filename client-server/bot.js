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
        this.roster = [];

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

            // get roster
            this.xmpp.send(xml(
                'iq',
                { id: 'roster_0', type: 'get' },
                xml('query', { xmlns: 'jabber:iq:roster' })
            ));
        });

        this.xmpp.on("stanza", async (stanza) => {
            console.log('incoming stanza', stanza);
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
                const { id, type } = stanza.attrs;
                if (type === 'result' && id === 'roster_0') {
                    const roster = stanza.getChild('query')?.getChildren('item');
                    this.roster = roster?.map(item => item.attr('jid'));
                    console.log(`Received result for ${id}. Roster is now ${this.roster}}`);
                }

                const jid = stanza.getChild('bind')?.getChild('jid')?.text();

                if (jid) {
                    console.log(`Received iq: I am ${jid}`);
                    if (this.jid && this.jid !== jid) {
                        throw new Error(`Received jid ${jid} from an iq but I am ${this.jid}`);
                    }
                    this.jid = jid;
                }
                else {
                    console.log(`Received iq: ${stanza.toString()}}`);
                }
            }

            else if (stanza.is('presence')) {
                const from = stanza.attr('from');
                const presence = Bot.getPresence(stanza);

                // if someone subscribes to us, subscribe back unconditionally
                if (presence === 'subscribe' || presence === 'unsubscribe') {
                    console.log(`Received ${presence} from ${from}`);
                    const msg = xml("presence", { type: `${presence}d`, to: from });
                    await this.xmpp.send(msg);
                    return;
                }

                console.log('presence', { from, presence });
            }

            else {
                console.log(`Received stanza: ${stanza.name}:\n${stanza.toString()}}`);
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
        const type = stanza.attr('type');

        if (type == 'subscribe' || type == 'subscribed' || type == 'unsubscribe' || type == 'unsubscribed') {
            return type;
        }

        const isConnected = type !== 'unavailable';
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