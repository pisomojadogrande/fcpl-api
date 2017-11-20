const AWS = require('aws-sdk');

if (!process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY) {
    console.error(`Ensure that AWS_ACCESS_KEY and AWS_SECRET_KEY are set in your environment`);
    process.exit(1);
}
AWS.config.credentials = new AWS.Credentials({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

const argv = require('minimist')(process.argv.slice(2));

function usage() {
    console.log(`Usage: ${process.argv[0]} ${process.argv[1]} --region <value> --table-name <value> --bucket-name <value> --function-name <value>)`);
    process.exit(255);
}
const AWS_REGION = argv['region'] || argv['r'];
const S3_BUCKET = argv['bucket-name'] || argv['b'];
const USER_TABLE_NAME = argv['table-name'] || argv['t'];
const S3_UPDATE_FUNCTION = argv['function-name'] || argv['f'];
(AWS_REGION && S3_BUCKET && USER_TABLE_NAME && S3_UPDATE_FUNCTION) || usage();

AWS.config.region = AWS_REGION;

const S3 = new AWS.S3();
const DDB = new AWS.DynamoDB();
const Lambda = new AWS.Lambda();

function getLibraryCardNumbersInner(accumulatedResults, lastEvaluatedKey, resolve, reject) {
    const params = {
        TableName: USER_TABLE_NAME,
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 10,
        ProjectionExpression: 'LibraryCardNumber'
    };
    DDB.scan(params, (err, data) => {
        if (err) reject(err);
        else {
            accumulatedResults = accumulatedResults.concat(data.Items);
            if (data.LastEvaluatedKey) {
                getLibraryCardNumbersInner(accumulatedResults, data.LastEvaluatedKey, resolve, reject);
            } else {
                resolve(accumulatedResults);
            }
        }
    });
}

function getLibraryCardNumbersPromise() {
    return new Promise((resolve, reject) => {
        getLibraryCardNumbersInner([], undefined, resolve, reject);    
    });
}


function invokeFunctionPromise(inputPayload) {
    return new Promise((resolve, reject) => {
        const params = {
            FunctionName: S3_UPDATE_FUNCTION,
            InvocationType: 'RequestResponse',
            LogType: 'Tail',
            Payload: JSON.stringify(inputPayload)
        };
        Lambda.invoke(params, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

getLibraryCardNumbersPromise().then((results) => {
    const inputRecords = results.map((item) => {
        return {
            eventName: 'ObjectCreated:Put',
            s3: {
                bucket: {
                    name: S3_BUCKET
                },
                object: {
                    key: item.LibraryCardNumber.S + '/latest.json'
                }
            }
        };
    });
    const inputPayload = {
        Records: inputRecords
    };
    console.log(`Invoking ${S3_UPDATE_FUNCTION} with ${JSON.stringify(inputPayload)}`);
    return invokeFunctionPromise(inputPayload);
}).then((result) => {
    console.log(JSON.stringify(result));
    console.log(new Buffer(result.LogResult, 'base64').toString('ascii'));
}).catch((err) => {
    console.error(err);
});