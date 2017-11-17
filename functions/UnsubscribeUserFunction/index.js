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
        completeSuccess(callback);
    }
};
