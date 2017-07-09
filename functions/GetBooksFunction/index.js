const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

function makeSessionId() {
    const buf10 = crypto.randomBytes(5);
    return buf10.toString('hex');
}

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    
    const sessionId = makeSessionId();
    console.log(`Session ${sessionId}`);
    
    const postData = querystring.stringify({
        user_id: process.env.FCPLAccountId,
        password: process.env.FCPLPassword
    });
    const httpsOptions = {
        hostname: 'fcplcat.fairfaxcounty.gov',
        port: 443,
        path: '/uhtbin/cgisirsi/?ps=' + sessionId + '/0/0/57/30',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    }
    
    console.log(`Making request ${JSON.stringify(httpsOptions)}`);
    var responseBody = "";
    const req = https.request(httpsOptions, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            responseBody += chunk;
        });
        res.on('end', () => {
            callback(null, responseBody);
        });
    });
    req.on('error', (e) => {
        console.error(`Request failed: ${e.message}`);
        callback(e);
    });
    req.write(postData);
    req.end();
};
