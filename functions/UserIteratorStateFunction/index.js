const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB();
const tableName = process.env.UserTableName;

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    
    const lastIdentityId = event.identityId || '';
    const scanParams = {
        TableName: tableName,
        Select: "SPECIFIC_ATTRIBUTES",
        ProjectionExpression: 'IdentityId, Email, LibraryCardNumber, LibraryPassword',
        Limit: 1,
        ReturnConsumedCapacity: 'TOTAL'
    };
    if (lastIdentityId) {
        scanParams.ExclusiveStartKey = {
            IdentityId: { S: lastIdentityId }
        };
    }
    console.log(JSON.stringify(scanParams));
    
    ddb.scan(scanParams, (err, data) => {
        if (err) callback(err);
        else {
            console.log(JSON.stringify(data));
            
            result = {
                done: (data.Items.length == 0)
            };
            
            if (data.Items.length > 0) {
                const item = data.Items[0];
                result.identityId = item.IdentityId.S;
                result.email = item.Email.S;
                result.libraryCardNumber = item.LibraryCardNumber.S;
            }
            
            callback(null, result);
        }
    });
};