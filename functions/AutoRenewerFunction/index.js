const AWS = require('aws-sdk');
const https = require('https');
const querystring = require('querystring');
const htmlparser = require('htmlparser');

const lambda = new AWS.Lambda();
const sns = new AWS.SNS();

const TOLERANCE_DAYS = 2;
const FCPL_HOSTNAME = 'fcplcat.fairfaxcounty.gov';

function invokeGetBooksPromise() {
    return new Promise((resolve, reject) => {
        const functionInput = {
            queryStringParameters: {
                forceRefresh: true
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

function postRenewPromise(books, renewAction) {
    if (books.length == 0) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
        
        const postDataParams = {
            user_id: process.env.FCPLAccountId,
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
                console.log(`Renewal results: ${JSON.stringify(renewalResults)}`);
                
                resolve(renewalResults);
            }
        }, {verbose: false});
        const parser = new htmlparser.Parser(handler);
        parser.parseComplete(renewResponse);
    });
}

function snsPublishPromise(books) {
    return new Promise((resolve, reject) => {
        const successfulRenewals = [];
        const unsuccessfulRenewals = [];
        books.forEach((book) => {
            if (book.success) {
                successfulRenewals.push(book);
            } else {
                unsuccessfulRenewals.push(book);
            }
        });
        message = `Attempted ${books.length} renewals.\nSuccessful renewals:\n${JSON.stringify(successfulRenewals, null, 2)}\nUnsuccessful renewals:\n${JSON.stringify(unsuccessfulRenewals, null, 2)}`;
        console.log(`Publishing message to topic ${process.env.SNSTopicArn}`);
        console.log(`Message: ${message}`);
        
        const params = {
            TopicArn: process.env.SNSTopicArn,
            Subject: `Renewal status for ${(new Date()).toString()}`,
            Message: message
        };
        sns.publish(params, (err, data) => {
            if (err) reject(err);
            else resolve(books);
        });
    })
}

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));

    var booksToRenew = [];
    invokeGetBooksPromise().then((response) => {
        console.log(`Renew action ${response.renewAction}`);
        booksToRenew = response.libraryItems.filter((book) => {
            return expiresSoon(book);
        });
        const titlesExpiringSoon = booksToRenew.map((book) => book.friendly);
        console.log(`Expiring soon: ${JSON.stringify(titlesExpiringSoon)}`);
        
        return postRenewPromise(booksToRenew, response.renewAction);
    }).then((renewResponse) => {
        if (booksToRenew.length > 0) {
            return parseRenewResponsePromise(renewResponse);
        } else {
            return Promise.resolve([]);
        }
    }).then((result) => {
        if (result) {
            console.log(JSON.stringify(result));
            return snsPublishPromise(result);
        } else {
            // Throw an error.  It appears that sometimes the renewal doesn't succeed;
            // needs more troubleshooting.
            return Promise.reject('Renewal response not recognized');
        }
    }).then((result) => {
        console.log(`Done; invalidating GetBooks cache`);
        return invokeGetBooksPromise();
    }).then((result) => {
        callback(null, result);
    }).catch((e) => {
        callback(e);
    });
};