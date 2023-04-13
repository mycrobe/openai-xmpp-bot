import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

export const listUsers = async () => {
    try {
        const { stdout, stderr } = await exec('ssh dockerpi.local sudo ejabberdctl registered_users dockerpi.local');
        const users = stdout.split('\n').filter((user) => user !== '');
        return users;
    }
    catch (e) {
        console.log(e);
    }
}

export const userExists = async (username) => {
    try {
        const existingUsers = await listUsers();
        return existingUsers.includes(username);
    }
    catch (e) {
        console.log(e);
    }
}

export const addUser = async (username) => {
    try {
        let { stdout, stderr } = await exec(`ssh dockerpi.local sudo ejabberdctl register ${username} dockerpi.local password`);
        console.log('added user', stdout, stderr);
    }
    catch (e) {
        console.log(e);
    }
}

export const addUserToRoster = async (rosterUser, username, nickname = username) => {
    try {
        ({ stdout, stderr } = await exec(`ssh dockerpi.local sudo ejabberdctl add_rosteritem ${rosterUser} dockerpi.local ${username} dockerpi.local ${username} Buddies both`));
        console.log('added user to roster', stdout, stderr);
    }
    catch (e) {
        console.log(e);
    }
}

export const botForUser = async (username, clazz) => {
    if (!await userExists(username)) {
        await addUser(username);
    }

    const bot = new clazz({ username });
    await bot.start();
    return bot;
};