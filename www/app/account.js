import React from 'react'
import ReactDOM from 'react-dom'
import { Layout } from './layout'
import { ErrorBar, SpinnerSubmitButton } from './controls'

import styles from './styles.css'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

const Account = React.createClass({
    getInitialState: function() {
        return {
            loading: true
        };
    },
    componentDidMount: function() {
        const cognitoUserPool = new AmazonCognitoIdentity.CognitoUserPool({
            UserPoolId: USER_POOL_ID,
            ClientId: USER_POOL_CLIENT_ID
        });
        const cognitoUser = cognitoUserPool.getCurrentUser();
        console.log('Current user ' + JSON.stringify(cognitoUser));
        if (cognitoUser) {
            const that = this;
            cognitoUser.getSession(function(err, data) {
                if (err) {
                    console.error(JSON.stringify(err));
                    that.redirectToSignin();
                } else {
                    const cognitoUserSession = data;
                    console.log('Current session ' + JSON.stringify(cognitoUserSession));
                    const idToken = cognitoUserSession.getIdToken();
                    that.startGetUser(idToken.jwtToken);
                }
            });
        } else {
            this.redirectToSignin();
        }
    },
    render: function() {
        return(
            <div><h1>Nothing yet</h1></div>
        );
    }
});

const endpoint = FCPL_API_ENDPOINT;

ReactDOM.render(
    <Layout>
        <Account endpoint={endpoint}/>
    </Layout>,
    document.getElementById('app')
);

