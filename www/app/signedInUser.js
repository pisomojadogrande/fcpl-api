const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const endpoint = FCPL_API_ENDPOINT;

const SignedInUser = function() {
    const cognitoUserPool = new AmazonCognitoIdentity.CognitoUserPool({
        UserPoolId: USER_POOL_ID,
        ClientId: USER_POOL_CLIENT_ID
    });
    
    this.cognitoUser = cognitoUserPool.getCurrentUser();
    console.log('Current user ' + JSON.stringify(this.cognitoUser));
    
        this.redirectToSignIn = function() {
        window.location = './signin.html';
    };
    
    this.redirectToAccountSetup = function() {
        window.location = './accountsetup.html';
    };
    
    this.authenticateOrRedirect = function(callback) {
        if (!this.cognitoUser) {
            this.redirectToSignIn();
        } else {
            const that = this;
            this.cognitoUser.getSession(function(err, data) {
                if (err) that.redirectToSignIn();
                else {
                    that.jwtToken = data.getIdToken().jwtToken;
                    
                    const getUserUrl = endpoint + '/user';
                    const headers = new Headers();
                    headers.append('Authorization', that.jwtToken);
                    fetch(getUserUrl, { headers: headers }).then((res) => {
                        if (res.status == 200) {
                            return res.json();
                        } else if (res.status == 404) {
                            that.redirectToAccountSetup();
                        } else if (res.status == 401) {
                            that.redirectToSignIn();
                        } else {
                            console.log('Other error ' + res.status);
                            callback(res.statusText);
                        }
                    }).then((user) => {
                        that.user = user;
                        callback(null, {
                            user: that.user,
                            cognitoUser: that.cognitoUser,
                            jwtToken: that.jwtToken
                        });
                    }).catch((err) => {
                        console.error(err);
                        callback(err);
                    });
                }
            });
        }
    };
    
};

module.exports = SignedInUser;