const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB();

ACAO_HEADERS = {
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Origin': '*'
};

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event, null, 2));
    callback(null, {
        statusCode: 200,
        headers: ACAO_HEADERS,
        body: JSON.stringify(event)
    });
};
