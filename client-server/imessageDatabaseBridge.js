/*
Portions of this code has been taken from, and modified from:

https://github.com/CamHenlin/imessagegraphqlserver/blob/master/src/imessage.js

*/

import sqlite3 from 'sqlite3';
import _ from 'lodash';
import { getNameByPhoneNumber } from './addressbookLookup.js';

const file = process.env.HOME + '/Library/Messages/chat.db';
const db = new sqlite3.Database(file);

export const DEFAULT_SINCE = (() => {
    let d = new Date();
    d.setDate(d.getDate() - 14);
    return d;
})();

const pollForChanges = (since = DEFAULT_SINCE) => {
    const time = since.getTime();
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const query = `
                SELECT COUNT(ROWID) as new_message_count
                FROM message
                WHERE ((message.date / 1000000000) + 978307200) * 1000 > ${time}
            `

            db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const isUpdate = rows[0].new_message_count > 0;
                    resolve(isUpdate);
                }
            });

        });
    });
};

const recentMessages = (since = DEFAULT_SINCE) => {
    const time = since.getTime();
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const query = `
                SELECT DISTINCT 
                    message.ROWID,
                    message.is_from_me,
                    handle.id,
                    chat.guid,
                    chat.chat_identifier,
                    chat.display_name as chat_display_name,
					message.text,
                    chat.display_name,
                    ((message.date / 1000000000) + 978307200) * 1000 AS date_epoch_ms
                FROM
                    message
                INNER JOIN chat_message_join ON message.ROWID = chat_message_join.message_id    
                INNER JOIN chat ON chat_message_join.chat_id = chat.ROWID
                INNER JOIN chat_handle_join ON chat.ROWID = chat_handle_join.chat_id
                INNER JOIN handle ON handle.ROWID = chat_handle_join.handle_id
                WHERE
                    -- message.is_from_me = 0 AND 
                    message.service = 'iMessage'
                    AND date_epoch_ms > ${time}
                GROUP BY message.ROWID
                ORDER BY message.date ASC
                `

            db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    });
}

const getParticipants = async (guid) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const query = `
                SELECT h.id
                FROM chat c
                INNER JOIN chat_handle_join chj ON c.ROWID = chj.chat_id
                INNER JOIN handle h ON chj.handle_id = h.ROWID
                WHERE c.guid = '${guid}' and c.service_name = 'iMessage';
            `;

            db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    });
}

export const getConversations = async (since = DEFAULT_SINCE) => {
    const messages = await recentMessages(since);
    if (!messages.length) {
        return { sortedGuids: [], conversations: {} }
    }
    const mostRecentRecievedAt = new Date(_.maxBy(messages, 'date_epoch_ms')?.date_epoch_ms);
    for await (const row of messages) {
        row.date = new Date(row.date_epoch_ms);

        if (row.is_from_me === 1) {
            row.display_name = 'You';
        }
        else if (!row.display_name) {
            row.display_name = await getNameByPhoneNumber(row.id);
        }
        else if (!row.display_name) {
            console.log('no display name for', row.id, 'just using that');
            row.display_name = row.id;
        }
    }

    const conversations = _.mapValues(
        _.groupBy(messages, 'guid'),
        (messages, guid) => {
            const first = _.last(messages);
            const notMe = _.find(messages, m => m.is_from_me === 0);
            const isMultiuserChat = !!first.chat_identifier.match(/^chat\d+$/);
            return {
                id: first.chat_identifier,
                guid,
                isMultiuserChat,
                display_name: isMultiuserChat ? first.chat_display_name : notMe?.display_name,
                latest_message: new Date(first.date_epoch_ms),
                messages: messages,
            }
        }
    );


    for await (const guid of Object.keys(conversations)) {
        const conversation = conversations[guid];

        // add names of participants to group chat conversations
        if (conversation.isMultiuserChat) {
            conversation.participants = await getParticipants(conversation.guid);
            for await (const participant of conversation.participants) {
                participant.name = await getNameByPhoneNumber(participant.id);
                if (!participant.name) {
                    participant.name = `Unknown (${participant.id})`;
                }
            }
            if (!conversation.display_name) {
                conversation.display_name = conversation.participants.map(p => p.name).join(', ');
            }
        }
        else {
            conversation.participants = [{
                id: conversation.id,
                name: conversation.display_name,
            }];

            // handle case where we have no display name for a conversation becasue the only messages in the convo
            // are from me.
            if (!conversation.display_name) {
                conversation.display_name = await getNameByPhoneNumber(conversation.id);
                if (!conversation.display_name) {
                    conversation.display_name = `Unknown (${conversation.id})`;
                }
            }
        }
    }

    const sortedGuids = _.sortBy(Object.keys(conversations), guid => {
        return conversations[guid].latest_message.getTime();
    });

    return { sortedGuids, conversations, mostRecentRecievedAt };
};

export const monitorForChanges = async (handleUpdate) => {
    let lastUpdate = DEFAULT_SINCE;
    let isUpdating = false;

    const checker = async () => {
        if (isUpdating) {
            console.log('ImessageDatabaseBridge: skipping scheduled update since one is already in progress');
            return;
        }

        isUpdating = true;
        const thisCheck = new Date();
        const isChange = await pollForChanges(lastUpdate);

        if (isChange) {
            console.log('ImessageDatabaseBridge: got change', lastUpdate);
        }

        await handleUpdate(isChange, lastUpdate);

        if (isChange) {
            lastUpdate = thisCheck;
        }
        
        isUpdating = false;
    }
    return setInterval(checker, 10000);
}

// const handleChange = async (since) => {
//     const { sortedGuids, conversations } = await getConversations(since);
//     console.log('conversations', conversations);
//     console.log('sortedGuids', sortedGuids);
// }

// const job = monitorForChanges(handleChange);
