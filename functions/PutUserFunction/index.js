const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB();
const tableName = process.env.UserTableName;

const lambda = new AWS.Lambda();

const ACAO_HEADERS = {
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Origin': '*'
};

const ERROR_INVALID_LOGIN = 'Invalid login';
const ERROR_MISSING_PARAMETERS = 'Missing parameters: libraryCardNumber and libraryPassword are required';
const ERROR_INVALID_CREDENTIALS = 'Library credentials provided do not work; please check them and try again';

function completeCallback(callback, error, data) {
    const result = {
        headers: ACAO_HEADERS
    };
    if (error) {
        if ((error == ERROR_MISSING_PARAMETERS) ||
            (error == ERROR_INVALID_CREDENTIALS)) {
            result.statusCode = 400;
            result.body = error;
        } else {
            result.statusCode = 500;
            result.body = 'Unexpected error';
        }
    } else {
        result.statusCode = 200;
        result.body = JSON.stringify(data);
    }
    console.log(`Result: ${JSON.stringify(result)}`);
    callback(null, result);
}

function validateCredentialsPromise(libraryCardNumber, libraryPassword) {
    return new Promise((resolve, reject) => {
        const functionInput = {
            queryStringParameters: {
                libraryCardNumber: libraryCardNumber,
                libraryPassword: libraryPassword
            }
        };
        const params = {
            FunctionName: process.env.GetBooksFunctionName,
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(functionInput)
        };
        lambda.invoke(params, (err, data) => {
            if (err) reject(err);
            else if (data.FunctionError) reject(data.FunctionError);
            else {
                const payload = JSON.parse(data.Payload);
                const statusCode = payload.statusCode;
                const bodyObj = JSON.parse(payload.body);
                console.log(`Lambda returned ${JSON.stringify(data)}`);
                if (statusCode == 200) {
                    resolve(bodyObj);
                } else if (statusCode == 400) {
                    reject(ERROR_INVALID_CREDENTIALS);
                } else {
                    reject(payload);
                }
            }
        });
    });
}

function writeCredentialsPromise(identityId, cognitoUserName, email, libraryCardNumber, libraryPassword) {
    return new Promise((resolve, reject) => {
        const timestamp = (new Date()).toISOString();
        console.log(`Writing ${identityId} - ${libraryCardNumber} @${timestamp}`);
        const params = {
            TableName: tableName,
            Item: {
                IdentityId: {
                    S: identityId
                },
                CognitoUserName: {
                    S: cognitoUserName
                },
                Email: {
                    S: email
                },
                LibraryCardNumber: {
                    S: libraryCardNumber
                },
                LibraryPassword: {
                    S: libraryPassword
                },
                LastUpdated: {
                    S: timestamp
                }
            }
        };
        ddb.putItem(params, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event, null, 2));
    
    if (!event.requestContext.authorizer || !event.requestContext.authorizer.claims) {
        console.error(`Invalid requestContext ${JSON.stringify(event.requestContext)}`);
        completeCallback(callback, 'Unexpected request context');
        return;
    }
    
    if (!event.queryStringParameters.libraryCardNumber || !event.queryStringParameters.libraryPassword) {
        console.error('Missing library card number or password');
        completeCallback(callback, ERROR_MISSING_PARAMETERS);
        return;
    }
    
    const identityId = event.requestContext.authorizer.claims.sub;
    const cognitoUserName = event.requestContext.authorizer.claims['cognito:username'];
    const email = event.requestContext.authorizer.claims.email;
    const libraryCardNumber = event.queryStringParameters.libraryCardNumber;
    const libraryPassword = event.queryStringParameters.libraryPassword;
    console.log(`Caller is ${identityId}, library card ${libraryCardNumber}`);
    
    validateCredentialsPromise(libraryCardNumber, libraryPassword).then(() => {
        return writeCredentialsPromise(identityId, cognitoUserName, email, libraryCardNumber, libraryPassword);
    }).then(() => {
        completeCallback(callback, null, {identityId: identityId});
    }).catch((e) => {
        console.error(JSON.stringify(e));
        completeCallback(callback, e);    
    });

};
