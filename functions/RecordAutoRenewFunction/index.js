const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB();

const AUTO_RENEW_ATTEMPT_TABLE_NAME = process.env.AutoRenewAttemptTableName;

function populateAutoRenewResult(autoRenewResultItems, ddbItem) {
    autoRenewResultItems.forEach((item) => {
        const disposition = item.success ? 'Success' : item.term.trim();
        if (!ddbItem[disposition]) {
            ddbItem[disposition] = { L: [] };
        }
        ddbItem[disposition].L.push({ S: item.description.trim() });
    });
}

exports.handler = (event, context, callback) => {
    if (!event.autoRenewResult || !event.autoRenewResult.items ||
        !event.currentUser || !event.currentUser.libraryCardNumber) {
        console.error(`Malformed input ${JSON.stringify(event)}`);
        callback('Bad input');
    } else {
        const libraryCardNumber = event.currentUser.libraryCardNumber;
        const timestamp = (new Date()).toISOString();
        const params = {
            TableName: AUTO_RENEW_ATTEMPT_TABLE_NAME,
            Item: {
                LibraryCardNumber: { S: libraryCardNumber },
                Timestamp: { S: timestamp }
            }
        };
        populateAutoRenewResult(event.autoRenewResult.items, params.Item);
        DDB.putItem(params, (err, data) => {
            if (err) {
                // Log it but keep going anyways.
                console.error(`Encountered DDB error for ${JSON.stringify(params)}: ${err}`);
                callback(null, err);
            } else {
                console.log(`Succeeded recording ${JSON.stringify(params)}`);
                callback(null, {});
            }
        });
    }
};
