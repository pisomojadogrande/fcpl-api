exports.handler = (event, context, callback) => {
    console.log(JSON.stringify(event));
    callback(null, `Hello ${process.env.FCPLAccountId}`);
};
