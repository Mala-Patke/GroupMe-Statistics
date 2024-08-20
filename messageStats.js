const { writeFileSync } = require('fs');
const messages = require('./messages.json');
const messages_rc = messages.map(e => {
    e.reactionCount = e.reactions ? e.reactions.reduce((prev, curr) => prev + curr.user_ids.length, 0) : 0;
    return e;
});

/*
 * Ideas
 * 1: popular days 
 * 2: likes by person (done)
 * 3: biggest likers (this one's gonna be funny)
 * 4: each users biggest contribution
 * 5: 
 */

function messageLeaders() {
    let lb = {};

    for(let message of messages) {
        if(!lb[message.name]) lb[message.name] = 1;
        else lb[message.name]++;
    }

    return Object.entries(lb).sort((a,b) => b[1]-a[1]);
}

function mostLikedUsers() {
    let lb = {};

    for(let message of messages_rc) {
        if(!lb[message.name]) lb[message.name] = message.reactionCount;
        else lb[message.name]+= message.reactionCount;
    }

    return Object.entries(lb).sort((a,b) => b[1]-a[1]);
}

function mostLikingUsers() {
    let lb = {};
    
    for(let message of messages_rc.filter(e => e.reactionCount > 0)) {
        for(let reaction of message.reactions) {
            for(let id of reaction.user_ids) {
                if(!lb[id]) lb[id] = 1;
                else lb[id]++;
            }
        }
    }

    let lbFormatted = [];
    for(let [id, val] of Object.entries(lb)) {
        lbFormatted.push([messages.find(e => e.sender_id == id)?.name, val]);
    }

    return lbFormatted.sort((a,b) => b[1]-a[1]);
}

function topMessagesByUser(user, amount = 10) {
    return messages_rc.filter(e => e.name == user)
        //.filter(e => e.reactionCount > 0)
        .sort((a, b) => b.reactionCount - a.reactionCount)
        .slice(0,amount)
        .map(e => ({
            message: `"${`${e.text ?? ''} ${e.attachments[0]?.url ?? ''}`.trim()}"`,
            reactionCount: e.reactionCount, 
            sentOn: new Date(e.created_at * 1000).toLocaleString()
        }));
}

function bestOf() {
    let lb = {};
    for(let name of messageLeaders().map(e => e[0])) lb[name] = topMessagesByUser(name, 1)[0];
    return Object.entries(lb).sort((a,b) => b[1]?.reactionCount - a[1]?.reactionCount);
}

function bestOf10() {
    let lb = {};
    for(let name of messageLeaders().map(e => e[0])) lb[name] = topMessagesByUser(name, 10);
    return Object.entries(lb).sort((a,b) => b[1]?.reactionCount - a[1]?.reactionCount);
}

function mostLikedMessages(likeCount = 1, amount = 3000) {
    let messages_by_reaction_count = messages_rc
        .filter(e => e.reactionCount >= likeCount)
        .sort((a, b) => b.reactionCount - a.reactionCount);

    
    return messages_by_reaction_count
        .slice(0,amount)
        .map(e => ({
            sender: e.name, 
            reactionCount: e.reactionCount, 
            message: `"${`${e.text ?? ''} ${e.attachments[0]?.url ?? ''}`.trim()}"`,
            sentOn: new Date(e.created_at * 1000).toLocaleString()
        }));
}

function dailyRecap(day) {
    let startTime = new Date(day);
    let endTime = new Date(startTime)
    endTime.setDate(endTime.getDate() + 1);

    return messages_rc
        .filter(e => e.created_at > startTime/1000 && e.created_at < endTime/1000)
        .map(e => ({
            message: `"${`${e.text ?? ''} ${e.attachments[0]?.url ?? ''}`.trim()}"`,
            name: e.name,
            reactionCount: e.reactionCount
        }));
}

function mostActiveOnDay(day) {
    let dateMessages = dailyRecap(day);
    let lb = {};

    for(let message of dateMessages) {
        if(!lb[message.name]) lb[message.name] = 1
        else lb[message.name]++
    }

    return Object.entries(lb).sort((a,b) => b[1]-a[1])[0];
}

function mostEventfulDays() {
    let lb = {};
    let date = new Date('4/3/2024');

    while(date.toLocaleDateString() != new Date().toLocaleDateString()) {
        lb[date.toLocaleDateString()] = dailyRecap(date.toLocaleDateString());
        date.setDate(date.getDate() + 1);
    }

    return Object.entries(lb)
        .sort((a,b) => b[1].length - a[1].length)
        .slice(0, 15)
        .map(e => [e[0], {
            messageCount: e[1].length,
            mostLikedMessage: e[1].reduce((prev, curr) => curr.reactionCount > prev.reactionCount ? curr : prev),
            mostActive: mostActiveOnDay(e[0])
        }]);
}

function mostCommonWords(name) {
    let lb = {};

    for(let message of messages.filter(e => e.name == name)) {
        if(message.text) {
            for(let word of message.text.split(/ +/)) {
                word = word.toLowerCase();
                if(!lb[word]) lb[word] = 1;
                else lb[word]++
            }
        }
    }

    return Object.entries(lb).sort((a,b) => b[1]-a[1]);
}

function mostCommonSayer(target) {
    let lb = {};
    
    for(let message of messages) {
        if(!message.text) continue;

        for(let word of message.text.toLowerCase().split(/ +/)) {
            if(word == target) {
                if(!lb[message.name]) lb[message.name] = 0;
                lb[message.name]++;
            }
        }
    }

    return Object.entries(lb).sort((a,b) => b[1] - a[1]);
} 

function userDataCSV() {
    let res = messageLeaders();

    for(let i in res) {
        res[i].push(mostLikedUsers().find(e => e[0] == res[i][0])[1]);
        res[i].push(mostLikingUsers().find(e => e[0] == res[i][0]) ? mostLikingUsers().find(e => e[0] == res[i][0])[1] : 0);
        res[i].push('')
        res[i].push(
            ...Object.values(
                bestOf().find(e => e[0] == res[i][0])
                ? bestOf().find(e => e[0] == res[i][0])[1]
                : null
            )
        )
    }

    writeFileSync('./page1.csv', res.map(e => e.join(',')).join('\n'));
}

function messagesCSV() {
    writeFileSync('./page2.csv', mostLikedMessages(12).map(e => Object.values(e).join(",")).join('\n'));
}

function personalHighlightsCSV() {
    writeFileSync('./page3.csv', 
        bestOf10()
            .map(e => `${e[0]},${e[1].map(i => i.message).join(",")}`)
            .join('\n')
    );
}

function dailyHighlightsCSV() {
    writeFileSync('./page4.csv', 
        mostEventfulDays()
            .map(e => `${e[0]},${e[1].messageCount},,${e[1].mostActive[0]},${e[1].mostActive[1]},,${e[1].mostLikedMessage.message},${e[1].mostLikedMessage.name},${e[1].mostLikedMessage.reactionCount}`)
            .join('\n')
    );
}

console.log(mostCommonSayer('megs'))