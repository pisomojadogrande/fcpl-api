const AWS = require('aws-sdk');
const https = require('https');
const querystring = require('querystring');
const htmlparser = require('htmlparser');

const lambda = new AWS.Lambda();
const sns = new AWS.SNS();

const TOLERANCE_DAYS = 2;
const FCPL_HOSTNAME = process.env.FCPLHostname;
const RENEW_RETRIES = 2;

function invokeGetBooksPromise(currentUser) {
    return new Promise((resolve, reject) => {
        const functionInput = {
            queryStringParameters: {
                forceRefresh: true,
                libraryCardNumber: currentUser.libraryCardNumber,
                libraryPassword: currentUser.libraryPassword
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
                const body = JSON.parse(data.Payload).body;
                console.log(`GetBooks response ${JSON.stringify(body, null, 2)}`);
                resolve(JSON.parse(body));
            }
        });
    });
}

function expiresSoon(book) {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + (TOLERANCE_DAYS * 24));
    var dueDate = new Date(book.dueDate);
    console.log(`book ${book.friendly}: Due ${dueDate}; deadline ${deadline}`);
    return (dueDate < deadline);
}

function postRenewPromise(currentUser, books, renewAction) {
    if (books.length == 0) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
        
        const postDataParams = {
            user_id: currentUser.libraryCardNumber,
            selection_type: 'selected'
        };
        books.forEach((book) => {
            postDataParams[book.renewName] = 'on'
        });
        const postData = querystring.stringify(postDataParams);
        console.log(`Posting: ${JSON.stringify(postDataParams)}`);
        
        const httpsOptions = {
            hostname: FCPL_HOSTNAME,
            port: 443,
            path: renewAction, // e.g. /uhtbin/cgisirsi/?ps=kno5lDoN62/PATRICK/22670009/193
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
            }            
        };
        console.log(`POST ${JSON.stringify(httpsOptions)}`);
        var responseBody = "";
        const req = https.request(httpsOptions, (res) => {
            console.log(`STATUS: ${res.statusCode}`);
            //console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            res.on('end', () => {
                console.log(`Response length: ${responseBody.length}`);
                console.log(responseBody);
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

function trimAndJoin(dom) {
    const textItems = htmlparser.DomUtils.getElementsByTagType('text', dom);
    return textItems.map((elt) => {
        return elt.data.replace(/\n\s*/g, '');
    }).join(' ');
}

function readRenewalResultsFromDom(dom) {
    const titleElements = htmlparser.DomUtils.getElementsByTagName('title', dom);
    if (titleElements.length == 0) {
        console.error(`Unexpected HTML: No title`);
        return null;
    }
    const title = trimAndJoin(titleElements[0]);
    if (!title.includes('Renewed')) {
        console.error(`Unexpected title for renewal page: ${title}`);
        return null;
    }
    
    const contentElements = htmlparser.DomUtils.getElements({class: 'content'}, dom);
    if (contentElements.length == 0) {
        console.error(`Unexpected HTML: No content element`);
        return null;
    }
    
    const dlElements = htmlparser.DomUtils.getElementsByTagName('dl', contentElements[0]);
    return dlElements.map((dlElement, index) => {
        const dtElements = htmlparser.DomUtils.getElementsByTagName('dt', dlElement);
        if (dtElements.length == 0){
            console.error(`Unexpected ${index}th renewal element: no dt`);
            return null;
        }
        const dtText = trimAndJoin(dtElements[0]);
        
        const ddElements = htmlparser.DomUtils.getElementsByTagName('dd', dlElement);
        if (ddElements.length == 0) {
            console.error(`Unexpected ${index}th renewal element: no dd`);
        }
        const ddText = trimAndJoin(ddElements[0]);
        
        const success = dtText.includes('Item renewed');
        const renewalItem = {
            success: success,
            term: dtText,
            description: ddText
        };
        console.log(`Renewal item ${index}: ${JSON.stringify(renewalItem)}`);
        return renewalItem;
    }).filter((item) => { return (item != null); });
}

function parseRenewResponsePromise(renewResponse) {
    return new Promise((resolve, reject) => {
        const handler = new htmlparser.DefaultHandler((err, dom) => {
            if (err) reject(err);
            else {
                const renewalResults = readRenewalResultsFromDom(dom);
                if (!renewalResults) {
                    reject(`Renewal failed`);
                }
                
                console.log(`Renewal results: ${JSON.stringify(renewalResults)}`);
                resolve(renewalResults);
            }
        }, {verbose: false});
        const parser = new htmlparser.Parser(handler);
        parser.parseComplete(renewResponse);
    });
}

function renewBooksPromiseWithRetries(currentUser, books, renewAction, retriesRemaining) {
    if (books.length == 0) {
        console.log(`No books; skipping renewal attempt`);
        return Promise.resolve([]);
    }
    if (!renewAction) {
        return Promise.reject(`Missing renewAction`);
    }
    
    const retryOnFail = (retriesRemaining > 0);
    return new Promise((resolve, reject) => {
        postRenewPromise(currentUser, books, renewAction).then((renewBooksResponse) => {
            return parseRenewResponsePromise(renewBooksResponse);
        }).then((renewalResult) => {
            resolve(renewalResult);
        }).catch((err) => {
            retriesRemaining--;
            console.error(`Failed to renew, retry=${retryOnFail}: ${err}`);
            if (retryOnFail) {
                // Better way to do a recursive Promise??
                renewBooksPromiseWithRetries(currentUser, books, renewAction, retriesRemaining).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            } else {
                reject(err);
            }
        });
    });
}

function refreshGetBooksCachePromise(currentUser, passThroughResult) {
    // Call GetBooks with forceRefresh=true, but ignore success/failure
    return invokeGetBooksPromise(currentUser).then(() => {
        return Promise.resolve(passThroughResult);
    }).catch((e) => {
        console.warn(`Could not refresh the cache (${e}) but proceeding anyways`);
        return Promise.resolve(passThroughResult);
    });
}

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    const getBooksResponse = event.getBooksResponse;
    const renewAction = getBooksResponse.renewAction;
    const currentUser = event.currentUser;

    var booksToRenew = getBooksResponse.libraryItems.filter((book) => {
        return expiresSoon(book);
    });
    const titlesExpiringSoon = booksToRenew.map((book) => book.friendly);
    console.log(`Expiring soon: ${JSON.stringify(titlesExpiringSoon)}`);
    
    renewBooksPromiseWithRetries(currentUser, booksToRenew, renewAction, RENEW_RETRIES).then((result) => {
        if (result && (result.length > 0)) {
            console.log(`Done; refreshing GetBooks cache`);
            return refreshGetBooksCachePromise(currentUser, result);
        } else {
            console.log(`Done; no books renewed`);
            return Promise.resolve(result);
        }
    }).then((result) => {
        const output = {
            items: result
        };
        callback(null, output);
    }).catch((e) => {
        callback(e);
    });
};