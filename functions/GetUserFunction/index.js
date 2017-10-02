const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB();
const tableName = process.env.UserTableName;

ACAO_HEADERS = {
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Origin': '*'
};

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event, null, 2));
    
    if (!event.requestContext.authorizer || !event.requestContext.authorizer.claims) {
        console.error(`Invalid requestContext ${JSON.stringify(event.requestContext)}`);
        callback('Unexpected request context');
    }
    
    const identityId = event.requestContext.authorizer.claims.sub;
    console.log(`Caller is ${identityId}`);
    
    const params = {
        TableName: tableName,
        Key: {
            IdentityId: {
                S: identityId
            }
        }
    };
    ddb.getItem(params, (err, data) => {
        const result = {
            statusCode: 200,
            headers: ACAO_HEADERS
        };
        if (err) result.body = JSON.stringify({error: err});
        else {
            const bodyObj = {};
            if (!data.Item) {
                console.log(`Caller ${identityId} not found`);
                result.statusCode = 404;
            } else {
                bodyObj.libraryCardNumber = data.Item.LibraryCardNumber.S;
                bodyObj.libraryPassword = data.Item.LibraryPassword.S;
                bodyObj.userName = data.Item.CognitoUserName.S;
                bodyObj.lastUpdated = data.Item.LastUpdated.S;
                console.log(`Caller ${identityId} is ${JSON.stringify(bodyObj)}`);
            }
            result.body = JSON.stringify(bodyObj);
        }
        callback(null, result);
    });
};
