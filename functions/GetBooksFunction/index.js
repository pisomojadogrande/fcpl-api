const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const htmlparser = require('htmlparser');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const S3_BUCKET = process.env.S3Bucket;
const CACHE_PREFIX = process.env.CachePrefix;
const LATEST_KEY = CACHE_PREFIX + "/latest.html";
const MAX_CACHED_AGE_SECS = 60 * 60 * 12;

function makeSessionId() {
    const buf10 = crypto.randomBytes(5);
    return buf10.toString('hex');
}

function fetchFromCache() {
    return new Promise((resolve, reject) =>  {
        const params = {
            Bucket: S3_BUCKET,
            Key: LATEST_KEY
        };
        console.log(`S3 request params ${JSON.stringify(params)}`);
        s3.getObject(params, (err, data) => {
            if (err) {
                console.error(`S3 error ${JSON.stringify(err)}`);
                if (err.code == 'NoSuchKey') {
                    resolve(null);
                } else reject(err);
            } else {
                const lastModified = Date.parse(data.LastModified);
                const ageMsec = Date.now() - lastModified;
                console.log(`Fetched ${data.ContentLength} bytes, age ${ageMsec / 1000} sec; last modified ${data.LastModified}`);
                if (ageMsec > (1000 * MAX_CACHED_AGE_SECS)) {
                    console.log('Content too old; fetching new');
                    resolve(null);
                } else {
                    resolve(data.Body);
                }
            }
        })
    });
}

function putInCache(content) {
    return new Promise((resolve, reject) => {
        // write to both latest.html and a timestamped key
        const timestampedKey = `${CACHE_PREFIX}/${(new Date()).toISOString()}-raw.html`;
        console.log(`Writing ${content.length} to ${timestampedKey}, ${LATEST_KEY}`);
        const promises = [LATEST_KEY, timestampedKey].map((s3key) => {
            const params = {
                Bucket: S3_BUCKET,
                Key: s3key,
                Body: content
            };
            return new Promise((innerResolve, innerReject) => {
                s3.putObject(params, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
        });
        return Promise.all(promises);
    }).then((allResults) => {
        console.log('Caching successful');
        return Promise.resolve(content);
    }).catch((e) => {
        console.warn(`Error caching content; continuing: ${e}`);
        return Promise.resolve(content);
    });
}


function fetchHtmlPromise(sessionId) {
    return new Promise((resolve, reject) => {
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
        };
        
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
                console.log(`Response length: ${responseBody.length}`);
                resolve(responseBody);
            });
        });
        req.on('error', (e) => {
            console.error(`Request failed: ${e.message}`);
            reject(e);
        });
        req.write(postData);
        req.end();        
    });
}

function fetchNew(sessionId) {
    return fetchHtmlPromise(sessionId).then(putInCache);
}

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    
    const sessionId = makeSessionId();
    console.log(`Session ${sessionId}`);
    
    fetchFromCache().then((content) => {
        if (content) {
            return Promise.resolve(content);
        } else {
            return fetchNew(sessionId);
        }
    }).then((content) => {
        callback(null, `Response size ${content.length}`);
    }).catch((e) => {
       callback(e); 
    });
 
};

