const { writeFileSync } = require('fs');
require('dotenv').config();

let baseURL = `https://api.groupme.com/v3/groups/${process.env.GID}/messages`;
let params = new URLSearchParams({
    token: process.env.TOKEN,
    limit: 100
});
let storedMessages = [];

function messagesRecursively() {
    fetch(`${baseURL}?${params.toString()}`)
        .then(res => res.json())
        .then(({ response: { messages } }) => {
            console.log(`Last message timestamp: ${Date(messages[messages.length - 1].createdAt)}`)
            params.set('before_id', messages[messages.length - 1].id);
            storedMessages.push(...messages);
            if(messages.length == 100) messagesRecursively();
            else writeFileSync('./messages.json', JSON.stringify(storedMessages));
        });
}

messagesRecursively();