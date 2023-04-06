import { exec } from 'child_process';

const sendiMessage = (recipient, message) => {
    return new Promise((resolve, reject) => {
        exec(`osascript zeroconf-xmpp/sendMessage.applescript "${recipient}" "${message}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

export default sendiMessage;