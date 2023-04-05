import sqlite3 from 'sqlite3';
import _ from 'lodash';
import { getNameByPhoneNumber } from './addressbookLookup.js';

const file = process.env.HOME + '/Library/Messages/chat.db';
const db = new sqlite3.Database(file);

export const DEFAULT_SINCE = (() => {
    let d = new Date();
    d.setDate(d.getDate() - 1);
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
                    resolve({ isUpdate, since });
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
                    chat.display_name,
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
                ORDER BY message.date DESC
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

export const getConversations = async (since = DEFAULT_SINCE) => {
    const messages = await recentMessages(since);
    const mostRecentRecievedAt = new Date(_.maxBy(messages, 'date_epoch_ms').date_epoch_ms);
    for await (const row of messages) {
        if (row.is_from_me === 1) {
            row.display_name = 'self';
        }
        else if (!row.display_name) {
            row.display_name = await getNameByPhoneNumber(row.id);
        }
        else if (!row.display_name) {
            console.log('no display name for', row.id);
            row.display_name = row.id;
        }
    }

    const conversations = _.groupBy(messages, 'guid');
    const sortedGuids = _.sortBy(Object.keys(conversations), guid => {
        return -conversations[guid][0].date_epoch_ms;
    });

    return { sortedGuids, conversations, mostRecentRecievedAt };
};

export const monitorForChanges = async (handleUpdate = console.log, since = DEFAULT_SINCE) => {
    let lastUpdate = since;
    
    const checker = async () => {
        const thisCheck = new Date();
        const { isUpdate } = await pollForChanges(lastUpdate);
        if (isUpdate) {
            handleUpdate(lastUpdate);
            lastUpdate = thisCheck;
        }
    }
    return setInterval(checker, 1000);
}

// const handleChange = async (since) => {
//     const { sortedGuids, conversations } = await getConversations(since);
//     console.log('conversations', conversations);
//     console.log('sortedGuids', sortedGuids);
// }

// const job = monitorForChanges(handleChange);
