const AWS = require('aws-sdk');

const DDB = new AWS.DynamoDB();
const USER_TABLE_NAME = process.env.UserTableName;
const EVENT_TABLE_NAME = process.env.EventTableName;
const DEFAULT_PAGE_SIZE = 50;

const ACAO_HEADERS = {
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Origin': '*'
};


function getLibraryCardNumberPromise(identityId) {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: USER_TABLE_NAME,
            Key: {
                IdentityId: { S: identityId }
            }
        };
        DDB.getItem(params, (err, data) => {
            if (err) reject(err);
            else {
                if (data.Item) {
                    resolve(data.Item.LibraryCardNumber.S);
                } else {
                    reject({
                        statusCode: 404,
                        errorMessage: 'User not found'
                    });
                }
            }
        });
    });
}


function getActivityEventsPromise(libraryCardNumber, pageSize, continuationToken) {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: EVENT_TABLE_NAME,
            Select: 'ALL_ATTRIBUTES',
            Limit: pageSize,
            ScanIndexForward: false,
            ExpressionAttributeValues: {
                ':libraryCardNumber': { S: libraryCardNumber }
            },
            KeyConditionExpression: 'LibraryCardNumber = :libraryCardNumber'
        };
        if (continuationToken) {
            params.ExclusiveStartKey = JSON.parse(continuationToken);
        }
        DDB.query(params, (err, data) => {
            if (err) {
                console.error(`DDB error for ${JSON.stringify(params)}: ${err}`);
                reject(err);
            } else {
                console.log(JSON.stringify(data));
                resolve(data);
            }
        });
    });
}


function fromDDBList(ddbValue) {
    if (ddbValue.L) {
        return ddbValue.L.map((item) => {
            return {
                name: item.M.Name.S,
                dueDate: item.M.DueDate.S,
                previousDueDate: item.M.OldDueDate ? item.M.OldDueDate.S : undefined
            };
        });
    } else return [];
}


function completeCallback(statusCode, body, callback) {
    const result = {
        statusCode: statusCode,
        headers: ACAO_HEADERS,
        body: JSON.stringify(body)
    };
    console.log(`Return: ${JSON.stringify(result)}`);
    callback(null, result);
}

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event, null, 2));
    
    if (!event.requestContext.authorizer || !event.requestContext.authorizer.claims) {
        console.error(`Invalid requestContext ${JSON.stringify(event.requestContext)}`);
        completeCallback(400, 'Unexpected request context', callback);
    }
    
    const identityId = event.requestContext.authorizer.claims.sub;
    console.log(`Caller is ${identityId}`);
    
    var pageSize = DEFAULT_PAGE_SIZE;
    var continuationToken = undefined;
    if (event.queryStringParameters) {
        pageSize = event.queryStringParameters.pageSize || DEFAULT_PAGE_SIZE;
        continuationToken = event.queryStringParameters.continuationToken;
    }

    getLibraryCardNumberPromise(identityId).then((libraryCardNumber) => {
        console.log(`Identity ${identityId} libraryCardNumber ${libraryCardNumber}`);
        return getActivityEventsPromise(libraryCardNumber, pageSize, continuationToken);
    }).then((result) => {
        console.log(JSON.stringify(result));
        const events = result.Items.map((item) => {
            return {
                libraryCardNumber: item.LibraryCardNumber.S,
                timestamp: item.Timestamp.S,
                newItems: fromDDBList(item.NewItems),
                deletedItems: fromDDBList(item.DeletedItems),
                changedItems: fromDDBList(item.ChangedItems)
            };
        });
        completeCallback(200, {
            identityId: identityId,
            events: events,
            nextContinuationToken: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined
        }, callback);
    }).catch((err) => {
        console.error(err);
        completeCallback(err.statusCode || 500, err.errorMessage, callback);
    });
};