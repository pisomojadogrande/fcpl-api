import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Layout, LayoutStyles } from './layout'
import { SpinnerSubmitButton } from './controls'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

const jwt = require('jsonwebtoken');

// Expire the JWT token cookie 10min earlier than the JWT actually expires
const JWT_COOKIE_EXPIRATION_BUFFER_MSEC = 600 * 1000;

var SignIn = React.createClass({
    
    userPoolId: USER_POOL_ID,
    userPoolClientId: USER_POOL_CLIENT_ID,
    
    propTypes: {
        initialUsername: PropTypes.string
    },
    getDefaultProps: function() {
        return {
            initialUsername: ''
        };
    },
    
    getInitialState: function() {
        return {
            username: this.props.initialUsername,
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
                const cookieVal = "username=" + that.state.username;
                document.cookie = cookieVal;
                
                // This will store a refresh token that will be valid for whatever
                // the Cognito User Pool was configured (default 30d)
                that.cognitoUser.cacheTokens();
                
                window.location = './index.html';
            },
            onFailure: function(err) {
                that.setState({
                    isSigningIn: false,
                    lastError: err.message
                });
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
        const submitButtonDisabled = (this.state.passwordWarning.length > 0);
        var newPasswordFieldSet = '';
        if (this.state.needsNewPassword) {
            newPasswordFieldSet = (
                <fieldset>
                    <legend>Looks like it's your first time... welcome!  Set a new password here:</legend>
                    <label htmlFor="newPassword">Password</label>
                    <input id="newPassword" type="password" onChange={this.onNewPasswordChange} placeholder="Password"/>

                    <label htmlFor="newPasswordAgain">Password (again)</label>
                    <input id="newPasswordAgain" type="password" onChange={this.onNewPasswordAgainChange} placeholder="Password"/>
                    
                    <label style={LayoutStyles.warningTextStyle}>{this.state.passwordWarning}</label>
                </fieldset>
            );
        }
        var errorBar = '';
        if (this.state.lastError) {
            errorBar = (
                <div style={LayoutStyles.errorBarStyle}>
                    <h3>{this.state.lastError}</h3>
                </div>
            );
        }
        return(
            <div className="pure-u-1" style={LayoutStyles.centerModalStyle}>
                <div style={LayoutStyles.centerFormStyle}>
                    <form className="pure-form pure-form-stacked">
                        <fieldset>
                            {errorBar}
                            <legend>
                                <h3>Sign in</h3>
                            </legend>
                            
                            <label htmlFor="username">Username</label>
                            <input id="username" onChange={this.onUsernameChange} placeholder="username" value={this.state.username} autoFocus/>
                            <span className="pure-form-message">required</span>
                            
                            <label htmlFor="password">Password</label>
                            <input id="password" type="password" onChange={this.onPasswordChange} placeholder="Password"/>
                            
                            <a href="./passwordreset.html">Forgot password?</a>
                            
                        </fieldset>
                        {newPasswordFieldSet}
                        <SpinnerSubmitButton loading={this.state.isSigningIn}
                                             disabled={submitButtonDisabled}
                                             submitButtonText='Sign in'
                                             onClick={this.onSignInButtonClicked}/>
                    </form>
                </div>
            </div>
        );
    }
});

const url = new URL(window.location.href);
const username = url.searchParams.get('username') || '';

ReactDOM.render(
    <Layout>
        <SignIn initialUsername={username}/>
    </Layout>,
    document.getElementById('app')
);