const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB();

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event, null, 2));
    callback(null, {
        statusCode: 200,
        body: JSON.stringify({foo: 'bar'})
    });
};
