const crypto = require('crypto');
const SUPER_DUPER_SECRET = process.env.SecretHashKey;

exports.hashUnsubscribe = function(userId, expires) {
    const hmac = crypto.createHmac('sha256', SUPER_DUPER_SECRET);
    const content = userId + '.' + expires;
    hmac.update(content);
    return hmac.digest('hex');
}