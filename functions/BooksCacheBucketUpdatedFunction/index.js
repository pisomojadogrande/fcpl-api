const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB();
const S3 = new AWS.S3();

const EVENT_TABLE_NAME = process.env.EventTableName;

function getLastRecordedEventPromise(libraryCardNumber) {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: EVENT_TABLE_NAME,
            Select: 'SPECIFIC_ATTRIBUTES',
            ScanIndexForward: false,
            Limit: 1,
            ExpressionAttributeNames: {
                '#ts': 'Timestamp'
            },
            ExpressionAttributeValues: {
                ':libraryCardNumber': { S: libraryCardNumber }
            },
            ProjectionExpression: '#ts',
            KeyConditionExpression: 'LibraryCardNumber = :libraryCardNumber'
        };
        DDB.query(params, (err, data) => {
            if (err) reject(err);
            else {
                if (data.Items.length > 0) {
                    resolve(data.Items[0]);
                } else {
                    resolve(null);
                }
            }
        })
    });
}

function getLatestItemsSincePromiseInner(
    bucket,
    libraryCardNumber,
    timestamp,
    continuationToken,
    accumulatedResults,
    resolve,
    reject
) {
    const prefix = libraryCardNumber + '/';
    const startAfter = timestamp ? prefix + timestamp + '.json' : undefined;
    const params = {
        Bucket: bucket,
        Prefix: prefix,
        StartAfter: startAfter,
        MaxKeys: 10,
        ContinuationToken: continuationToken
    };
    S3.listObjectsV2(params, (err, data) => {
        if (err) {
            console.error(`S3 error on ${JSON.stringify(params)}; ${err}`);
            reject(err);
        } else {
            
            // Process it only if the contents have changed
            data.Contents.forEach((o) => {
                var lastETag = undefined;
                if (accumulatedResults.length > 0) {
                    lastETag = accumulatedResults[accumulatedResults.length - 1].ETag;
                }
                if (o.ETag != lastETag) {
                    accumulatedResults.push(o);
                }
            });
            
            if (data.IsTruncated) {
                getLatestItemsSincePromiseInner(
                    bucket,
                    libraryCardNumber,
                    timestamp,
                    data.NextContinuationToken,
                    accumulatedResults,
                    resolve,
                    reject
                );
            } else {
                console.log(`Account ${libraryCardNumber} has ${accumulatedResults.length} events`);
                resolve(accumulatedResults);
            }
        }
    });
}

function getLatestItemsSincePromise(
    bucket,
    libraryCardNumber,
    timestamp
) {
    return new Promise((resolve, reject) => {
        getLatestItemsSincePromiseInner(
            bucket,
            libraryCardNumber,
            timestamp,
            undefined,
            [],
            resolve,
            reject
        );
    });
}

function getLatestItemsPromise(bucket, libraryCardNumber) {
    return getLastRecordedEventPromise(libraryCardNumber).then((lastItem) => {
        console.log(`Account ${libraryCardNumber}: ${JSON.stringify(lastItem)}`);
        const timestamp = lastItem ? lastItem.Timestamp.S : undefined;
        return getLatestItemsSincePromise(bucket, libraryCardNumber, timestamp);
    }).catch((err) => {
        console.warn(`Account ${libraryCardNumber} encountered error ${err}`);
        return Promise.resolve(null);
    })
}

function s3GetObjectPromise(bucket, key, eTag) {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: bucket,
            Key: key
        };
        const result = params;
        S3.getObject(params, (err, data) => {
            if (err) {
                console.error(`S3 error at ${bucket} / ${key}: ${err}`);
                result.Error = err;
            } else {
                const content = data.Body.toString();
                result.Content = JSON.parse(content);
                result.ETag = eTag;
            }
            resolve(result);
        });
    });
}

function compareBooks(book1, book2) {
    return book1.friendly.localeCompare(book2.friendly);
}

function prepareItemsDiff(previousItems, currentItems) {
    const result = {
        NewItems: [],
        DeletedItems: [],
        ChangedItems: []
    };
    const prevSorted = previousItems.sort(compareBooks);
    const curSorted = currentItems.sort(compareBooks);
    var prevIndex = 0;
    var curIndex = 0;
    while ((prevIndex < prevSorted.length) || (curIndex < curSorted.length)) {
        const curItem = (curIndex < curSorted.length) ? curSorted[curIndex] : undefined;
        const prevItem = (prevIndex < prevSorted.length) ? prevSorted[prevIndex] : undefined;
        if (curItem && prevItem) {
            const compareResult = compareBooks(prevItem, curItem);
            if (compareResult == 0) {
                if (curItem.dueDate != prevItem.dueDate) {
                    curItem.oldDueDate = prevItem.dueDate;
                    result.ChangedItems.push(curItem);
                }
                curIndex++;
                prevIndex++;
            } else if (compareResult < 0) {
                // prevItem does not exist in the current items
                result.DeletedItems.push(prevItem);
                prevIndex++;
            } else {
                // curItem does not exist in the previous items
                result.NewItems.push(curItem);
                curIndex++;
            }
        } else if (curItem) {
            // curItem does not exist in the previous items
            result.NewItems.push(curItem);
            curIndex++;
        } else { // prevItem
            // prevItem does not exist in the current items
            result.DeletedItems.push(prevItem);
            prevIndex++;
        }
    }
    return result;
}

function prepareDiffs(itemsArray) {
    const successItems = itemsArray.filter((item) => {
        return item.Content;
    });
    
    // Start at the second item, and compare to the previous.
    return successItems.slice(1).map((item, index) => {
        return {
            Key: item.Key,
            ETag: item.ETag,
            Diff: prepareItemsDiff(successItems[index].Content, item.Content)
        };
    });
}

function diffItemsToDDBList(diffItems) {
    return diffItems.map((diffItem) => {
        const result = {
            Name: { S: diffItem.friendly },
            DueDate: { S: diffItem.dueDate }
        };
        if (diffItem.oldDueDate) {
            result.OldDueDate = { S: diffItem.oldDueDate }
        };
        return { M: result };
    });
}

function recordDiffEventPromise(diffEvent) {
    const matches = diffEvent.Key.match(/([0-9]+)\/([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z)\.json/);
    if (!matches) {
        return Promise.resolve(`Rejecting invalid key ${diffEvent.Key}`);
    }
    const libraryCardNumber = matches[1];
    const timestamp = matches[2];
    
    return new Promise((resolve, reject) => {
        console.log(`Recording diff event for ${libraryCardNumber}, ${timestamp}: ${JSON.stringify(diffEvent)}`);
        const params = {
            TableName: EVENT_TABLE_NAME,
            Item: {
                LibraryCardNumber: { S: libraryCardNumber },
                Timestamp: { S: timestamp },
                ETag: { S: diffEvent.ETag },
                NewItems: { L: diffItemsToDDBList(diffEvent.Diff.NewItems) },
                DeletedItems: { L: diffItemsToDDBList(diffEvent.Diff.DeletedItems) },
                ChangedItems: { L: diffItemsToDDBList(diffEvent.Diff.ChangedItems) },
                RecordedAt: { S: (new Date()).toISOString() }
            }
        };
        DDB.putItem(params, (err, data) => {
            if (err) {
                resolve(`Error for ${JSON.stringify(params)}: ${err}`);
            } else {
                resolve(diffEvent.Key);
            }
        });
    });
}

exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    
    const s3Events = event.Records.filter((r) => {
        return (r.eventName.startsWith('ObjectCreated') && r.s3);
    });
    const bucket = (s3Events.length > 0) ? s3Events[0].s3.bucket.name : undefined;
    
    const libraryCardNumbers = Array.from(new Set(
        s3Events.map((r) => {
            return r.s3.object.key.match(/([0-9]+)\//);
        }).filter((m) => {
            return m;
        }).map((m) => {
            return m[1];
        })
    ));
    
    console.log(`Accounts: ${libraryCardNumbers}; bucket ${bucket}`);
    
    const getLatestItemsPromises = libraryCardNumbers.map((libraryCardNumber) => {
        return getLatestItemsPromise(bucket, libraryCardNumber);
    });
    Promise.all(getLatestItemsPromises).then((results) => {
        const allAccountsPromises = results.map((s3ObjectArray) => {
            // Each element of the 'results' array is an array of S3
            // ListObjectsV2 results for that account.
            const getContentsPromises = s3ObjectArray.map((s3Object) => {
                return s3GetObjectPromise(bucket, s3Object.Key, s3Object.ETag);    
            });
            return Promise.all(getContentsPromises);
        });
        return Promise.all(allAccountsPromises);
    }).then((results) => {
        const recordAccountDiffsPromises = results.map((itemArray) => {
            // Each element of the 'results' array is an array of items,
            // each with its S3 key and retrieved contents.
            return prepareDiffs(itemArray);
        }).map((diffsArray) => {
            // Each of these is a series of diff events
            const recordDiffsPromises = diffsArray.map((diffEvent) => {
                return recordDiffEventPromise(diffEvent);
            });
            return Promise.all(recordDiffsPromises);
        });
        return Promise.all(recordAccountDiffsPromises);
    }).then((results) => {
        callback(null, results);
    }).catch((err) => {
        callback(err);
    });
};
