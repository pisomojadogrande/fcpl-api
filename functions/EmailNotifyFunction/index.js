const AWS = require('aws-sdk');
const SES = new AWS.SES();

const unsubscribe = require('./unsubscribe.js');

const FROM_ADDRESS = process.env.FromAddress;
const WEB_ENDPOINT = process.env.WebEndpoint;
const LINK_EXPIRATION_SECONDS = 3600 * 24 * 7;

function subjectLineFromInput(items) {
    const numSuccesses = items.filter((item) => {
        return item.success;
    }).length;
    const numFailures = items.length - numSuccesses;
    return `FCPL renewals: ${numSuccesses} succeeded; ${numFailures} failed`;
}

function messageBodyFromInput(items) {
    const successfulRenewals = items.filter((item) => {
        return item.success;
    });
    const failedRenewals = items.filter((item) => {
        return !item.success;
    });
    
    var successfulRenewalsText = "No items were renewed.";
    if (successfulRenewals.length > 0) {
        successfulRenewalsText = `${successfulRenewals.length} items were successfully renewed:\n`;
        successfulRenewalsText += successfulRenewals.map((item) => {
            return "* " + item.description;
        }).join("\n");
    }
    
    var failedRenewalsText = "";
    if (failedRenewals.length > 0) {
        failedRenewalsText = `${failedRenewals.length} items could not be renewed:\n`;
        failedRenewalsText += failedRenewals.map((item) => {
            return "* " + item.description + " -- " + item.term;
        }).join("\n");
    }
    
    return successfulRenewalsText + "\n\n" + failedRenewalsText;
}

function unsubscribeLine(userId) {
    const expires = Math.round((new Date()).getTime() / 1000) + LINK_EXPIRATION_SECONDS;
    const hash = unsubscribe.hashUnsubscribe(userId, expires);
    const line = `(Not yet implemented:) Want to stop receiving these notifications?  Follow this link: ${WEB_ENDPOINT}/unsubscribe?userId=${userId}&expires=${expires}&hash=${hash}`;
    console.log(line);
    return line;
}

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    
    if (!event.autoRenewResult || !event.autoRenewResult.items ||
        !event.currentUser || !event.currentUser.identityId || !event.currentUser.email) {
        console.error(`Malformed input ${JSON.stringify(event)}`);
        callback('Bad input');
    } else {
        const sender = FROM_ADDRESS;
        const userEmail = event.currentUser.email;
        const subjectLine = subjectLineFromInput(event.autoRenewResult.items);
        const messageBody = messageBodyFromInput(event.autoRenewResult.items) +
                            "\n" +
                            unsubscribeLine(event.currentUser.identityId);
        const params = {
            Source: sender,
            Destination: {
                ToAddresses: [ userEmail ]
            },
            Message: {
                Subject: {
                    Data: subjectLine
                },
                Body: {
                    Text: {
                        Data: messageBody
                    }
                }
            }
        };
        console.log(`Sending email from ${sender} to ${userEmail} - ${subjectLine}`);
        SES.sendEmail(params, (err, data) => {
            if (err) {
                console.error(`Error sending to ${userEmail}: ${JSON.stringify(err)}`);
                if (err.code == 'MessageRejected') {
                    // While still in the sandbox, this is possible
                    console.warn(`Skipping MessageRejected error for ${userEmail}`);
                    callback(null, err);
                } else {
                    callback(err);
                }
            } else {
                console.log(`Successfully sent to ${userEmail}: ${JSON.stringify(data)}`);
                callback(null, data);
            }
        });
    }
};