const ACAO_HEADERS = {
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Origin': '*'
};

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    callback(null, {
        headers: ACAO_HEADERS,
        statusCode: 200
    });
};
