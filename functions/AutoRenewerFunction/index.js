const AWS = require('aws-sdk');
const https = require('https');
const querystring = require('querystring');


const lambda = new AWS.Lambda();

const TOLERANCE_DAYS = 1;
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

function timesRenewedInt(book) {
    if (book.timesRenewed && (book.timesRenewed.length > 0)) {
        return parseInt(book.timesRenewed);
    } else return 0;
}

function collectRenewalResults(oldItems, newItems) {
    return oldItems.map((oldItem) => {
        const newItem = newItems.find((item) => {
            return (item.friendly == oldItem.friendly);
        });
        if (newItem) {
            const resultItem = newItem;
            if (timesRenewedInt(newItem) > timesRenewedInt(oldItem)) {
                resultItem.status = 'SUCCESS';
            } else {
                resultItem.status = 'ERROR_NOT_RENEWED';
            }
            return resultItem;
        } else {
            console.warn(`Unexpected: Cannot find ${oldItem.friendly} in the results`);
            const errorItem = oldItem;
            errorItem.status = 'ERROR_MISSING'
            return errorItem;
        }
    });
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
        //booksToRenew.push(response.libraryItems[2]);
        //console.log(`DELETEME: ${JSON.stringify(titlesExpiringSoon)}`);
        //return Promise.resolve();
    }).then(() => {
        // Scraping the renewal response looks like it's going to be tedious.
        // Instead, just re-request the list of books and due dates, and
        // compare timesRenewed.
        if (booksToRenew.length > 0) {
            return invokeGetBooksPromise();
        } else {
            return Promise.resolve({ libraryItems: [] });
        }
    }).then((response) => {
        const result = collectRenewalResults(booksToRenew, response.libraryItems);
        console.log(JSON.stringify(result));
        callback(null, result);
    }).catch((e) => {
        callback(e);
    });
};