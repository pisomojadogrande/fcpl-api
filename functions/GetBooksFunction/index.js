const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const htmlparser = require('htmlparser');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const S3_BUCKET = process.env.S3Bucket;
const MAX_CACHED_AGE_SECS = 3600 * process.env.MaxCacheAgeHours;

const FCPL_HOSTNAME = 'fcplcat.fairfaxcounty.gov';

const ERROR_INVALID_LOGIN = 'Invalid login';

ACAO_HEADERS = {
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Origin': '*'
}

function latestKey(cachePrefix) {
    return cachePrefix + '/latest.json';
}

function fetchFromCachePromise(ctx, forceRefresh) {
    if (forceRefresh) {
        return Promise.resolve(ctx);
    }
    return new Promise((resolve, reject) =>  {
        const params = {
            Bucket: S3_BUCKET,
            Key: latestKey(ctx.cachePrefix)
        };
        console.log(`S3 request params ${JSON.stringify(params)}`);
        s3.getObject(params, (err, data) => {
            if (err) {
                console.error(`S3 error ${JSON.stringify(err)}`);
                if (err.code == 'NoSuchKey') {
                    resolve(ctx);
                } else reject(err);
            } else {
                const lastModified = new Date(data.LastModified);
                const ageMsec = Date.now() - lastModified;
                const etag = data.ETag.replace(/"/g, '');
                console.log(`Fetched ${data.ContentLength} bytes etag=${etag}, age ${ageMsec / 1000} sec; last modified ${data.LastModified}`);
                ctx.cachedETag = etag;
                if (ageMsec > (1000 * MAX_CACHED_AGE_SECS)) {
                    console.log('Content too old; fetching new');
                    resolve(ctx);
                } else {
                    ctx.content = data.Body.toString();
                    ctx.items = JSON.parse(ctx.content);
                    ctx.lastModified = lastModified.toISOString();
                    resolve(ctx);
                }
            }
        })
    });
}

function putInCachePromise(ctx, cachePrefix) {
    const content = JSON.stringify(ctx.items, null, 2);
    const md5 = crypto.createHash('md5').update(content).digest('hex');
    const isContentChanged = !(ctx.cachedETag && (ctx.cachedETag == md5));
    if (!isContentChanged) {
        console.log(`Cached content matches etag ${md5}`);
    }
    
    return new Promise((resolve, reject) => {
        // write to both latest.html and a timestamped key;
        // the timestamped key only if something has changed
        const keys = [latestKey(ctx.cachePrefix)];
        if (isContentChanged) {
            keys.push(`${ctx.cachePrefix}/${(new Date()).toISOString()}.json`);  
        }
        console.log(`Writing ${content.length} etag=${md5} to ${JSON.stringify(keys)}`);
        const promises = keys.map((s3key) => {
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
        return Promise.resolve(ctx);
    }).catch((e) => {
        console.warn(`Error caching content; continuing: ${e}`);
        return Promise.resolve(ctx);
    });
}

function obtainSessionPromise(ctx) {
    return new Promise((resolve, reject) => {
        const url = 'https://' + FCPL_HOSTNAME + '/uhtbin/cgisirsi/0/0/0/57/30';
        console.log(`Making request to ${url} to get a session`);
        https.get(url, (res) => {
            var responseBody = "";
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            res.on('end', () => {
                console.log(`Response length: ${responseBody.length}`);
                const handler = new htmlparser.DefaultHandler((err, dom) => {
                    if (err) reject(err);
                    else {
                        const loginForms = htmlparser.DomUtils.getElements({
                            tag_name: 'form',
                            name: 'loginform'
                        }, dom);
                        if (loginForms.length != 1) {
                            console.error(`${loginForms.length} matching forms; expected exactly 1: ${JSON.stringify(loginForms)}`);
                            reject(`Unexpected HTML content at ${url}`);
                        } else if (!(loginForms[0].attribs && loginForms[0].attribs.action)) {
                            console.error(`Unexpected attributes at ${url}: ${JSON.stringify(loginForms[0].attribs)}`);
                            reject(`Unexpected HTML content at ${url}`);
                        } else {
                            const action = loginForms[0].attribs.action;
                            console.log(`Login action ${action}`);
                            ctx.loginAction = action;
                            resolve(ctx);
                        }
                    }
                }, {verbose: false});
                const parser = new htmlparser.Parser(handler);
                parser.parseComplete(responseBody);                
            });
            if (res.statusCode != 200) {
                reject(res);
            }
        }).on('error', (e) => {
            console.error(`https GET error ${e}`);
            reject(e);
        });
    });
}


function fetchHtmlPromise(ctx) {
    return new Promise((resolve, reject) => {
        
        const postData = querystring.stringify({
            user_id: ctx.libraryCardNumber,
            password: ctx.libraryPassword
        });
        
        const httpsOptions = {
            hostname: FCPL_HOSTNAME,
            port: 443,
            path: ctx.loginAction, // e.g. /uhtbin/cgisirsi/?ps=zMiGwqwXUF/0/0/57/30
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        console.log(`Making request to ${httpsOptions.hostname}${httpsOptions.path}`);
        //console.log(JSON.stringify(httpsOptions));
        var responseBody = "";
        const req = https.request(httpsOptions, (res) => {
            //console.log(`STATUS: ${res.statusCode}`);
            //console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            res.on('end', () => {
                console.log(`Response length: ${responseBody.length}`);
                ctx.content = responseBody;
                ctx.lastModified = (new Date()).toISOString();
                resolve(ctx);
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

function trimAndJoin(dom) {
    const textItems = htmlparser.DomUtils.getElementsByTagType('text', dom);
    return textItems.map((elt) => {
        return elt.data.replace(/\n\s*/g, '');
    }).join(' ');
}

function readFromDom(dom) {
    const result = {};
    const renewitemsForms = htmlparser.DomUtils.getElements({
        tag_name: 'form',
        id: 'renewitems'
    }, dom);
    if (renewitemsForms.length == 0) {
        console.log('No renewitems form; assuming no items');
        return { items: [] };
    }
    
    const renewitemsForm = renewitemsForms[0];
    result.renewAction = renewitemsForm.attribs.action;
    
    const renewCharge = htmlparser.DomUtils.getElementById('renewcharge', renewitemsForm);
    if (!renewCharge) {
        console.info('No renewcharge element');
        return result;
    }
    
    result.items = htmlparser.DomUtils.getElementsByTagName('tr', renewCharge).map((row) => {
        return tds = htmlparser.DomUtils.getElementsByTagName('td', row);
    }).filter((tds) => {
        if (tds.length < 4) {
            console.warn(`Malformed? ${JSON.stringify(tds)}`);
            return false;
        }
        return true;
    }).map((tds, index) => {
        // console.log(`Item ${index}: ${JSON.stringify(tds)}`);
        const item = {};
        
        const td0Input = htmlparser.DomUtils.getElements({
            tag_name: 'input',
            type: 'checkbox'
        }, tds[0])[0];
        item.renewId = td0Input.attribs.id;
        item.renewName = td0Input.attribs.name;
        //console.log(`Item ${index} id=${item.renewId} name=${item.renewName}`);
        
        const td1Label = htmlparser.DomUtils.getElements({
            tag_name: 'label',
            'for': item.renewId
        }, tds[1])[0];
        item.friendly = trimAndJoin(td1Label);
        //console.log(`Item ${index} friendly=${item.friendly}`);
        
        const td2Strong = htmlparser.DomUtils.getElementsByTagName('strong', tds[2])[0];
        if (td2Strong) {
            item.timesRenewed = trimAndJoin(td2Strong);
            console.log(`Item ${index} elt=${JSON.stringify(td2Strong)} timesRenewed=${item.timesRenewed}`);
        }
        
        const dueDate = trimAndJoin(tds[3]);
        //console.log(`Item ${index} dueDate=${dueDate}`);
        item.dueDate = new Date(dueDate);
        
        //console.info(`Item ${index}: ${JSON.stringify(item)}`);
        return item;
    });
    return result;
}

function getError(dom) {
    const errors = htmlparser.DomUtils.getElements({
        class: (val) => { return val && (val.indexOf('error') > -1); }
    }, dom);
    if (errors.length > 0) {
        console.error(`HTML shows errors: ${JSON.stringify(errors)}`);
        return trimAndJoin(errors[0]);
    } else {
        return undefined;
    }
}

function parseHtmlPromise(ctx) {
    return new Promise((resolve, reject) => {
        const handler = new htmlparser.DefaultHandler((err, dom) => {
            if (err) reject(err);
            else {
                ctx.dom = dom;
                const error = getError(dom);
                if (error) {
                    // The error page says 'Invalid login', but not hardcoding that here;
                    // it's the only error that would get us a 200.
                    console.error(`error: ${error}`);
                    reject({errorCode: ERROR_INVALID_LOGIN});
                } else {
                    const readResult = readFromDom(dom);
                    if (readResult) {
                        ctx.items = readResult.items;
                        ctx.renewAction = readResult.renewAction;
                        resolve(ctx);
                    } else {
                        console.log(ctx.content);
                        reject('Unexpected response content')
                    }
                }
            }
        }, {verbose: false});
        const parser = new htmlparser.Parser(handler);
        parser.parseComplete(ctx.content);
    });
}

function completeCallback(callback, error, data) {
    const result = {
        headers: ACAO_HEADERS
    };
    if (error) {
        if (error.errorCode == ERROR_INVALID_LOGIN) {
            result.statusCode = 400;
        } else {
            result.statusCode = 500;
        }
        result.body = JSON.stringify(error);
    } else {
        result.statusCode = 200;
        result.body = JSON.stringify(data);
    }
    console.log(`Result: ${JSON.stringify(result)}`);
    callback(null, result);
}

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    
    var forceRefresh = false;
    const ctx = {
        libraryCardNumber: process.env.FCPLAccountId,
        libraryPassword: process.env.FCPLPassword,
    };
    if (event.queryStringParameters) {
        forceRefresh = event.queryStringParameters.forceRefresh;
        if (event.queryStringParameters.libraryCardNumber) {
            ctx.libraryCardNumber = event.queryStringParameters.libraryCardNumber;
            ctx.libraryPassword = event.queryStringParameters.libraryPassword;
            console.log(`Using non-default account ${ctx.libraryCardNumber}`);
        }
    }
    ctx.cachePrefix = 'cache/' + ctx.libraryCardNumber;
      
    fetchFromCachePromise(ctx, forceRefresh).then((ctx) => {
        if (ctx.items) return Promise.resolve(ctx);
        else return obtainSessionPromise(ctx)
                        .then(fetchHtmlPromise)
                        .then(parseHtmlPromise)
                        .then(putInCachePromise);
    }).then((ctx) => {
        var result = {
            libraryItems: ctx.items,
            lastModified: ctx.lastModified
        };
        if (forceRefresh) {
            result.renewAction = ctx.renewAction;
        }
        completeCallback(callback, null, result);
    }).catch((e) => {
        completeCallback(callback, e);
    });
 
};


