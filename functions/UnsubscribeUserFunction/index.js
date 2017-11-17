const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB();
const TABLE_NAME = process.env.UserTableName;

const unsubscribe = require('./unsubscribe.js');

const ACAO_HEADERS = {
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Origin': '*'
};

function hasExpired(expires) {
    const expiresEpoch = parseInt(expires);
    const nowEpoch = (new Date()).getTime() / 1000;
    console.log(`Now is ${nowEpoch}; expires ${expiresEpoch}, ${expiresEpoch - nowEpoch} from now`);
    return (nowEpoch > expiresEpoch);
}

function validateHash(userId, expires, hash) {
    const expectedHash = unsubscribe.hashUnsubscribe(userId, expires);
    console.log(`Hash values: expected ${expectedHash} actual ${hash}`);
    return (expectedHash == hash);
}

function updateUserPromise(userId) {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: TABLE_NAME,
            Key: {
                IdentityId: {
                    S: userId
                }
            },
            ConditionExpression: 'attribute_exists(IdentityId)',
            ExpressionAttributeValues: {
                ':none': {
                    S: 'NONE'
                }
            },
            UpdateExpression: 'SET Notifications = :none'
        };
        ddb.updateItem(params, (err, data) => {
            if (err) reject(err);
            else {
                resolve(data);
            }
        })
    });
}

function completeCallback(callback, statusCode, body) {
    callback(null, {
        headers: ACAO_HEADERS,
        statusCode: statusCode,
        body: body
    });
}

function completeSuccess(callback) {
    completeCallback(callback, 200);
}

function completeError(callback, error) {
    completeCallback(callback, 400, error);
}

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    if (!(event.pathParameters &&
          event.pathParameters.userId &&
          event.queryStringParameters &&
          event.queryStringParameters.expires &&
          event.queryStringParameters.hash)) {
        completeError(callback, 'Missing parameters');
    } else if (hasExpired(event.queryStringParameters.expires)) {
        completeError(callback, 'Link has expired');
    } else if (!validateHash(event.pathParameters.userId,
                             event.queryStringParameters.expires,
                             event.queryStringParameters.hash)) {
        completeError(callback, 'Invalid request');
    } else {
        updateUserPromise(event.pathParameters.userId).then((result) => {
            console.log(`Update succeeded for ${event.pathParameters.userId}: ${JSON.stringify(result)}`);
            completeSuccess(callback);
        }).catch((err) => {
            console.error(`DynamoDB error for ${event.pathParameters.userId}: ${err}`);
            completeError(callback, 'Update failed');
        })
    }
};
