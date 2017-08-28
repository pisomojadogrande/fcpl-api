import React from 'react'
import ReactDOM from 'react-dom'
import { Layout, LayoutStyles } from './layout'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const AWS = require('aws-sdk');

const Styles = {
    warningStyle: {
        color: 'red'
    }
};

var SignIn = React.createClass({
    
    userPoolId: USER_POOL_ID,
    userPoolClientId: USER_POOL_CLIENT_ID,
    
    getInitialState: function() {
        return {
            username: '',
            password: '',
            needsNewPassword: false,
            newPassword: '',
            newPasswordAgain: '',
            passwordWarning: '',
            isSigningIn: false
        };
    },
    onUsernameChange: function(e) {
        this.setState({
            username: e.target.value
        });
    },
    onPasswordChange: function(e) {
        this.setState({
            password: e.target.value
        });
    },
    validateNewPassword: function(password, passwordAgain) {
        if ((password.length > 0) && (password != passwordAgain)) {
            return '! Passwords do not match';
        } else if (password.length < 6) {
            return '! Password must be at least 6 characters';
        }
        return '';
    },
    onNewPasswordChange: function(e) {
        const passwordWarning = this.validateNewPassword(e.target.value, this.state.newPasswordAgain);
        this.setState({
            newPassword: e.target.value,
            passwordWarning: passwordWarning
        });
    },
    onNewPasswordAgainChange: function(e) {
        const passwordWarning = this.validateNewPassword(this.state.newPassword, e.target.value);
        this.setState({
            newPasswordAgain: e.target.value,
            passwordWarning: passwordWarning
        });
    },
    signIn: function() {
        const authenticationData = {
            Username: this.state.username,
            Password: this.state.password
        };
        const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
        const poolData = {
            UserPoolId: USER_POOL_ID,
            ClientId: USER_POOL_CLIENT_ID
        };
        const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        const userData = {
            Username: this.state.username,
            Pool: userPool
        };
        this.cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        this.setState({
            isSigningIn: true
        });
        const that = this;
        this.cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function(result) {
                alert("Success " + result.getAccessToken().getJwtToken());
            },
            onFailure: function(err) {
                that.setState({
                    isSigningIn: false
                });
                alert("Failure " + err);
            },
            newPasswordRequired: function(userAttributes, requiredAttributes) {
                that.sessionContext = this;
                that.userAttributes = userAttributes;
                that.setState({
                    needsNewPassword: true,
                    isSigningIn: false
                });
            }
        });
    },
    completePasswordChallenge: function() {
        this.setState({
            isSigningIn: true
        });
        delete this.userAttributes.email_verified;
        this.cognitoUser.completeNewPasswordChallenge(
            this.state.newPassword,
            this.userAttributes,
            this.sessionContext
        );
    },
    onSignInButtonClicked: function(e) {
        e.preventDefault();
        if (this.state.needsNewPassword) {
            this.completePasswordChallenge();
        } else {
            this.signIn();
        }
    },
    render: function() {
        const submitButtonDisabled = this.state.isSigningIn || (this.state.passwordWarning.length > 0);
        var newPasswordFieldSet = '';
        if (this.state.needsNewPassword) {
            newPasswordFieldSet = (
                <fieldset>
                    <legend>Looks like it's your first time... welcome!  Set a new password here:</legend>
                    <label htmlFor="newPassword">Password</label>
                    <input id="newPassword" type="password" onChange={this.onNewPasswordChange} placeholder="Password"/>

                    <label htmlFor="newPasswordAgain">Password (again)</label>
                    <input id="newPasswordAgain" type="password" onChange={this.onNewPasswordAgainChange} placeholder="Password"/>
                    
                    <label style={Styles.warningStyle}>{this.state.passwordWarning}</label>
                </fieldset>
            );
        }
        return(
            <div className="pure-u-1" style={LayoutStyles.centerModalStyle}>
                <div style={LayoutStyles.centerFormStyle}>
                    <form className="pure-form pure-form-stacked">
                        <fieldset>
                            <legend>
                                <h3>Sign in</h3>
                            </legend>
                            
                            <label htmlFor="username">Username</label>
                            <input id="username" onChange={this.onUsernameChange} placeholder="username" autoFocus/>
                            <span className="pure-form-message">required</span>
                            
                            <label htmlFor="password">Password</label>
                            <input id="password" type="password" onChange={this.onPasswordChange} placeholder="Password"/>
                            
                            <label htmlFor="remember" className="pure-checkbox">
                                <input id="remember" type="checkbox" disabled="true"/>  Remember me
                            </label>
                            
                        </fieldset>
                        {newPasswordFieldSet}
                        <button type="submit" disabled={submitButtonDisabled} className="pure-button pure-button-primary" style={{marginTop: "10px"}} onClick={this.onSignInButtonClicked}>Sign in</button>
                    </form>
                </div>
            </div>
        );
    }
});



ReactDOM.render(
    <Layout>
        <SignIn />
    </Layout>,
    document.getElementById('app')
);