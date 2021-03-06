import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Layout } from './layout'
import { SpinnerSubmitButton } from './controls'
import styles from './styles.css'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

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
    
    componentDidMount: function() {
        const cognitoUserPool = new AmazonCognitoIdentity.CognitoUserPool({
            UserPoolId: USER_POOL_ID,
            ClientId: USER_POOL_CLIENT_ID
        });
        const cognitoUser = cognitoUserPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.signOut();
        }
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
    renderNewPasswordFields: function() {
        if (this.state.needsNewPassword) {
            return (
                <fieldset>
                    <legend>Looks like it's your first time... welcome!  Set a new password here:</legend>
                    <label htmlFor="newPassword">Password</label>
                    <input id="newPassword" type="password" onChange={this.onNewPasswordChange} placeholder="Password"/>

                    <label htmlFor="newPasswordAgain">Password (again)</label>
                    <input id="newPasswordAgain" type="password" onChange={this.onNewPasswordAgainChange} placeholder="Password"/>
                    
                    <label className={styles.warning}>{this.state.passwordWarning}</label>
                </fieldset>
            );
        } else {
            return '';
        }
    },
    render: function() {
        const submitButtonDisabled = (this.state.passwordWarning.length > 0);
        var errorBar = '';
        if (this.state.lastError) {
            errorBar = (
                <div className={styles.errorBar}>
                    <h3>{this.state.lastError}</h3>
                </div>
            );
        }
        return(
            <div className={["pure-u-1", styles.centerModal].join(' ')}>
                <div className={styles.centerForm}>
                    <form className="pure-form pure-form-stacked">
                        <fieldset>
                            {errorBar}
                            <legend>
                                <h3>Sign in <a href="./signup.html">(Sign up?)</a></h3>
                            </legend>
                            
                            <label htmlFor="username">Username</label>
                            <input id="username" onChange={this.onUsernameChange} placeholder="username" value={this.state.username} autoFocus/>
                            <span className="pure-form-message">required</span>
                            
                            <label htmlFor="password">Password</label>
                            <input id="password" type="password" onChange={this.onPasswordChange} placeholder="Password"/>
                            
                            <a href="./passwordreset.html">Forgot password?</a>
                            
                        </fieldset>
                        {this.renderNewPasswordFields()}
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
const username = (url.searchParams && url.searchParams.get('username')) || '';

ReactDOM.render(
    <Layout>
        <SignIn initialUsername={username}/>
    </Layout>,
    document.getElementById('app')
);