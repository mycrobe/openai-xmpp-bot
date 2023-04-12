import { client, xml } from "@xmpp/client";
import debug from "@xmpp/debug";

export const defaults = Object.freeze({
    name: "Bot",
    url: "xmpp://dockerpi.local:5222",
    username: "admin",
    password: "password",
    handleMessage: console.log,
});

export default class Bot {
    constructor(args) {
        const { name, id, url, username, password, handleMessage } = { ...defaults, ...args };

        this.name = name;
        this.id = username;
        this.handleMessage = handleMessage;
        this.roster = [];
        this.isInitialized = new Promise((resolve => this._resolveInitialized = resolve));

        this._initXmpp({ url, username, password });
    }

    async sendMessage(to, body) {
        await this.isInitialized;
        const message = xml(
            "message",
            { type: "chat", to: to },
            xml("body", {}, body),
        );
        await this.xmpp.send(message);
    }

    async _doPresenceSubscribe(action, to) {
        await this.isInitialized;
        const presenceMsg = xml("presence", { type: action, to });
        this._log(presenceMsg.toString());
        await this.xmpp.send(presenceMsg);
    }

    async subscribe(to) {
        await this._doPresenceSubscribe('subscribe', to);
    }

    async unsubscribe(to) {
        await this._doPresenceSubscribe('unsubscribe', to);
    }

    async subscribed(to) {
        await this._doPresenceSubscribe('subscribed', to);
    }

    async unsubscribed(to) {
        return this._doPresenceSubscribe('unsubscribed', to);
    }

    // async subscribeOrUnsubscribe(presence, from) {
    //     await this.isInitialized;
    //     const presenceMsg = xml("presence", { type: `${presence}d`, to: from });
    //     this._log(presenceMsg.toString());
    //     await this.xmpp.send(presenceMsg);

    //     const to = this.jid.substring(0, this.jid.indexOf('/'));
    //     const subscription = presence === 'subscribe' ? "both" : "remove";
    //     const subscriptionMsg = xml(
    //         "iq", { id: "subMsg_0", type: "set", to },
    //         xml("query", { xmlns: "jabber:iq:roster" },
    //             xml("item", { jid: from, subscription })
    //         )
    //     );
    //     this._log(subscriptionMsg.toString());
    //     await this.xmpp.send(subscriptionMsg);
    // }

    async start() {
        await this.xmpp.start();
    }

    async stop() {
        await this.xmpp.stop();
    }

    _log(...args) {
        console.log(`${this.id}:`, ...args);
    }

    _initXmpp({ url, username, password }) {
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
            this._log(`${this.id} online at ${address}`);

            //   Makes itself available
            const presence = xml("presence");
            await this.xmpp.send(presence);

            // request roster, will get it later in an `iq` request
            await this.xmpp.send(xml(
                'iq',
                { id: 'roster_0', type: 'get' },
                xml('query', { xmlns: 'jabber:iq:roster' })
            ));

            this._resolveInitialized(true);    
        });

        this.xmpp.on("stanza", async (stanza) => {
            this._log('incoming stanza', stanza.toString());
            if (stanza.is('message')) {
                const { from, to } = stanza.attrs;
                if (this.jid.indexOf(to) !== 0) {
                    throw new Error(`Received message for ${to} but I am ${this.xmpp.jid}`);
                }

                // work out what type of message this is, based on chatstate and body
                const type = Bot.getMessageType(stanza);
                if (type !== 'message') {
                    this._log(`Received ${type} from ${from}`);
                    return;
                }

                const body = stanza.getChild('body')?.text();
                this._log(`Received message from ${from}: ${body}`);

                this.handleMessage({ from, body });
            }

            else if (stanza.is('iq')) {
                const { id, type } = stanza.attrs;
                if (type === 'result' && id === 'roster_0') {
                    const roster = stanza.getChild('query')?.getChildren('item');
                    this.roster = roster?.map(item => item.attr('jid'));
                    this._log(`Received result for ${id}. Roster is now ${this.roster}`);
                }

                const jid = stanza.getChild('bind')?.getChild('jid')?.text();

                if (jid) {
                    this._log(`Received iq: I am ${jid}`);
                    if (this.jid && this.jid !== jid) {
                        throw new Error(`Received jid ${jid} from an iq but I am ${this.jid}`);
                    }
                    this.jid = jid;
                    this.account = jid.substring(0, jid.indexOf('/'));
                }
                else {
                    this._log(`Received iq: ${stanza.toString()}}`);
                }
            }

            else if (stanza.is('presence')) {
                const from = stanza.attr('from');
                const presence = Bot.getPresence(stanza);

                // if someone subscribes to us, subscribe back unconditionally
                if (presence === 'subscribe' || presence === 'unsubscribe') {
                    this._log(`Received ${presence} from ${from}`);
                    await this[`${presence}d`](from);
                    return;
                }

                this._log('presence', { from, presence });
            }

            else {
                this._log(`Received stanza: ${stanza.name}:\n${stanza.toString()}}`);
            }
        });
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