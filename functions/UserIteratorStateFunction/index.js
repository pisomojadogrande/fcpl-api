const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB();
const tableName = process.env.UserTableName;

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    
    const scanParams = {
        TableName: tableName,
        Select: "SPECIFIC_ATTRIBUTES",
        ProjectionExpression: 'IdentityId, Email, LibraryCardNumber, LibraryPassword, Notifications',
        Limit: 1,
        ReturnConsumedCapacity: 'TOTAL'
    };
    if (event.currentUser && event.currentUser.identityId) {
        scanParams.ExclusiveStartKey = {
            IdentityId: { S: event.currentUser.identityId }
        };
    }
    console.log(JSON.stringify(scanParams));
    
    ddb.scan(scanParams, (err, data) => {
        if (err) callback(err);
        else {
            console.log(JSON.stringify(data));
            
            if (data.Items.length > 0) {
                const item = data.Items[0];
                result = {
                    done: false,
                    identityId: item.IdentityId.S,
                    libraryCardNumber: item.LibraryCardNumber.S,
                    libraryPassword: item.LibraryPassword.S,
                    email: item.Email.S,
                    notifications: 'EMAIL'
                };
                if (item.Notifications) {
                    result.notifications = item.Notifications.S;
                }
            } else {
                result = {
                    done: true
                };
            }
            
            callback(null, { currentUser: result });
        }
    });
};