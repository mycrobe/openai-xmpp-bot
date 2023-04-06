import { monitorForChanges, getConversations } from './imessageDatabaseBridge.js';
import sendMessage, { broadcastMessage } from './sendMessage.js';
import sendiMessage from './sendiMessage.js';

const port = 12346;

const getBots = async () => {
    const conversations = await getConversations();

    // for now, just do me.
    conversations.sortedGuids = ['iMessage;-;+16468233032'];

    const result = [];
    for await (const guid of conversations.sortedGuids) {
        const convo = conversations.conversations[guid];

        const handleMessageFromXmpp = async (message, recipient) => {
            if (message.body === 'recap') {
                const lastimsg = convo.messages[0];
                const response = `${lastimsg.display_name}: ${lastimsg.text}`;
                await sendMessage(recipient, guid, response);
            } else {
                console.log(message, recipient);
                await sendiMessage(guid, message.body);
            }
        }

        return {
            port,
            advertiseName: guid,
            displayName: convo.display_name,
            handleMessage: handleMessageFromXmpp,
            handleComposing: async (composing) => { /* ignored */ },
        }
    }

    monitorForChanges(async (since) => {
        const { sortedGuids, conversations } = await getConversations(since);
        console.log(conversations);
        for await (const guid of sortedGuids) {
            const convo = conversations[guid];
            for await (const msg of convo.messages.reverse()) {
                const response = msg.text;
                await broadcastMessage(
                    guid,
                    response,
                    (availableRecipient) => availableRecipient.to.indexOf('@') > -1
                );
            }
        }
    });

    // TODO support multiple bots
    return result[0];
}

export default getBots;