/*
Portions of this code has been taken from, and modified from:

https://github.com/CamHenlin/imessagegraphqlserver/blob/master/src/imessage.js

*/

import sqlite3 from 'sqlite3';
import glob from 'glob';
import _ from 'lodash';

export const getNameByPhoneNumber = _.memoize((phone) => {

    return new Promise((resolve, reject) => {

        // check the length of the phone number
        if (phone.length === 11) {
            // if the length is 11, assume it's a US number and format it accordingly
            phone = "%1%" + phone.slice(1, 4) + "%" + phone.slice(4, 7) + "%" + phone.slice(7);
        } else if (phone.length === 12) {
            // if the length is 12, assume it's an international number and format it accordingly
            phone = "%" + phone.slice(0, 2) + "%" + phone.slice(2, 5) + "%" + phone.slice(5);
        } else {
            // if the length is neither 11 nor 12, return the original input and hope for the best
            
        }

        // the ** here is important, your contacts are split over several different directories!
        return glob(process.env.HOME + '/Library/Application\ Support/AddressBook/**/AddressBook-v22.abcddb', async function (err, files) {
            if (err) {
                return reject(err);
            }
            for (const file of files) {
                let value;
                try {
                    value = await new Promise((resolve, reject) => {
                        let db = new sqlite3.Database(file);
                        return db.serialize(function () {
                            let SQL = `
                                SELECT * FROM 
                                ZABCDCONTACTINDEX
                                LEFT OUTER JOIN ZABCDPHONENUMBER ON ZABCDCONTACTINDEX.ZCONTACT = ZABCDPHONENUMBER.ZOWNER
                                LEFT OUTER JOIN ZABCDEMAILADDRESS ON ZABCDEMAILADDRESS.ZOWNER = ZABCDCONTACTINDEX.ZCONTACT
                                LEFT OUTER JOIN ZABCDMESSAGINGADDRESS ON ZABCDMESSAGINGADDRESS.ZOWNER = ZABCDCONTACTINDEX.ZCONTACT
                                LEFT OUTER JOIN ZABCDRECORD ON ZABCDRECORD.Z_PK = ZABCDCONTACTINDEX.ZCONTACT
                                WHERE ZABCDCONTACTINDEX.ZSTRINGFORINDEXING LIKE "%${phone}%"
                            `;

                            db.all(SQL, function (err, rows) {
                                if (err) {
                                    return reject(err);
                                }
                                if (rows.length > 0) {
                                    try {
                                        const output = rows[0].ZFIRSTNAME + ' ' + ((rows[0].ZLASTNAME) ? rows[0].ZLASTNAME : "");
                                        return resolve(output);
                                    } catch (e) {
                                        return reject(e);
                                    }
                                }
                                resolve();
                            });
                        });
                    })
                } catch (err) {
                    return reject(err);
                }

                if (value) {
                    return resolve(value);
                }
            }

            resolve();
        });
    })
});