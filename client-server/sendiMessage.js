import { exec } from 'child_process';

const sendiMessage = (recipient, message) => {
    message = message.replace(/'/g, "\\'");
    return new Promise((resolve, reject) => {
        exec(`osascript client-server/sendMessage.applescript '${recipient}' '${message}'`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

export default sendiMessage;