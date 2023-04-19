import { client, xml } from "@xmpp/client";
import debug from "@xmpp/debug";

import { botForUser } from "./adminTasks.js";

export const defaults = Object.freeze({
    name: "Bot",
    url: "xmpp://dockerpi.local:5222",
    username: "admin",
    password: "password",
});

export default class Bot {
    constructor(args) {
        const { name, id, url, username, password } = { ...defaults, ...args };

        this.name = name;
        this.id = username;
        this.roster = [];
        this.isInitialized = new Promise((resolve => this._resolveInitialized = resolve));
        this.gotRoster = new Promise((resolve => this._resolveGotRoster = resolve));
        this.show = 'chat';
        this.status = '';

        this._initXmpp({ url, username, password });
    }

    async setFullname(fullName) {
        const iq = xml(
            'iq',
            { type: 'set', id: 'fullName_0', to: this.account, from: this.account },
            xml(
                'vCard',
                { xmlns: 'vcard-temp' },
                xml('FN', {}, fullName)
            )
        );

        this.xmpp.send(iq);
    }

    async handleConnection(address) {
        await this.isInitialized;

        // Makes itself available
        await this.setStatus('chat');

        // request roster, will get it later in an `iq` request
        await this.xmpp.send(xml(
            'iq',
            { id: 'roster_0', type: 'get' },
            xml('query', { xmlns: 'jabber:iq:roster' })
        ));
    }

    async handleMessage(from, message) {
        this._log(`Received message from ${from}: ${message}`);
    }

    // default implementation of subscription: subscribe back 
    async handlePresenceSubscription(from) {
        // accepts their request
        await this.presenceSubscribed(from);

        // requests back
        await this.presenceSubscribe(from);
    }

    async handlePresenceUnsubscription(from) {
        await this.presenceUnsubscribed(from);
        await this.presenceUnsubscribe(from);
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

    async setStatus(show, status) {
        if (!['chat', 'away', 'xa', 'dnd'].includes(show)) {
            throw new Error(`Invalid status: ${show}`);
        }

        if (('show' === 'away' || show === 'xa') && !status) {
            this._log(
                `setting away or xa status without a message will cause
adium to hide the contact. Using default message ("away")`);
            status = 'away';
        }

        await this.isInitialized;

        const children = [
            xml("show", {}, show),
        ];
        if (status) {
            children.push(xml("status", {}, status));
        }

        const presence = xml("presence", {}, children);
        await this.xmpp.send(presence);

        this.show = show;
        this.status = status;
    }

    async _doPresenceSubscribe(action, to) {
        await this.isInitialized;
        const presenceMsg = xml("presence", { type: action, to, from: this.jid });
        this._log('sending presence', action, to, presenceMsg.toString());
        await this.xmpp.send(presenceMsg);
    }

    async _doIqSubscribe(action, to) {
        await this.isInitialized;

        const itemAttrs = { jid: to };
        if (action === 'subscribe') {
            itemAttrs.ask = 'subscribe';
        }
        else if (action === 'unsubscribe') {
            itemAttrs.subscription = 'remove';
        }
        else {
            throw new Error(`Invalid action: ${action}`);
        }

        const iq = xml(
            "iq",
            { id: "subscribe_0", type: "set", to: this.account, from: this.jid },
            xml(
                "query",
                { xmlns: "jabber:iq:roster" },
                xml("item", itemAttrs)
            )
        );

        this._log('sending iq', action, to, iq.toString());
        this.xmpp.send(iq);
    }

    async presenceSubscribe(to) {
        await this._doPresenceSubscribe('subscribe', to);
    }

    async presenceUnsubscribe(to) {
        await this._doPresenceSubscribe('unsubscribe', to);
    }

    async iqSubscribe(to) {
        await this._doIqSubscribe('subscribe', to);
    }

    async iqUnsubscribe(to) {
        await this._doIqSubscribe('unsubscribe', to);
    }

    async presenceSubscribed(to) {
        await this._doPresenceSubscribe('subscribed', to);
    }

    async presenceUnsubscribed(to) {
        return this._doPresenceSubscribe('unsubscribed', to);
    }

    async start() {
        await this.xmpp.start();
        await this.isInitialized;
    }

    async stop() {
        await this.xmpp.stop();
    }

    _log(...args) {
        console.log(`${this.id}:`, ...args);
    }

    async _handleMessage(stanza) {
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

        this.handleMessage(from, body);
    }

    async _handleIq(stanza) {
        const { id, type } = stanza.attrs;
        const jid = stanza.getChild('bind')?.getChild('jid')?.text();
        const query = stanza.getChild('query');

        if (type === 'result' && id === 'roster_0') {
            const roster = stanza.getChild('query')?.getChildren('item');
            this.roster = roster?.map(item => item.attr('jid'));
            this._resolveGotRoster && this._resolveGotRoster();
            delete this._resolveGotRoster;
            this._log(`Received result for ${id}. Roster is now ${this.roster}`);
        }
        else if (jid) {
            this._log(`Received iq: I am ${jid}`);
            if (this.jid && this.jid !== jid) {
                throw new Error(`Received jid ${jid} from an iq but I am ${this.jid}`);
            }
            this.jid = jid;
            this.account = jid.substring(0, jid.indexOf('/'));
        }
        else if (query && query.attr('xmlns') === 'jabber:iq:roster') {
            // just accept whatever the roster query requests
            const attrs = {
                type: 'result',
                id: stanza.attr('id'),
                to: stanza.attr('to'),
                from: stanza.attr('to'),
            };

            const result = xml('iq', attrs);
            this._log(`Received subscription iq: ${stanza.toString()}}. Sending accept result: ${result.toString()}`);
            await this.xmpp.send(result);
        }
        else {
            this._log(`Received iq: ${stanza.toString()}}`);
        }
    }

    async _handlePresence(stanza) {
        const from = stanza.attr('from');
        const presence = Bot.getPresence(stanza);

        switch (presence) {
            // if someone subscribes to us, subscribe back unconditionally
            case 'subscribe':
                await this.handlePresenceSubscription(from);
                break;
            case 'unsubscribe':
                await this.handlePresenceUnsubscription(from);
                break;
            default:
                this._log('ignoring presence', { from, presence }, stanza.toString());
        }

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
            this._resolveInitialized(true);

            await this.handleConnection(address);
        });

        this.xmpp.on("stanza", async (stanza) => {
            this._log('incoming stanza', stanza.toString());
            switch (stanza.name) {
                case 'presence':
                    this._handlePresence(stanza);
                    break;
                case 'message':
                    this._handleMessage(stanza);
                    break;
                case 'iq':
                    this._handleIq(stanza);
                    break;
                default:
                    this._log(`Unhandled stanza: ${stanza.name}\n${stanza.toString()}`);
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

        if ((state && state != 'active') || !body) {
            return state;
        }

        return 'message';
    }

    static async forUser(...args) {
        return botForUser(...args)
    }
}

export class EchoBot extends Bot {
    handleMessage(from, body) {
        this._log(`Echoing message back to ${from}: ${body}`)
        this.sendMessage(from, body);
    }
}

