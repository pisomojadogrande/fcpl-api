import React from 'react'
import ReactDOM from 'react-dom'
import { Layout, LayoutStyles } from './layout'
import { SpinnerSubmitButton } from './controls'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

var PasswordReset = React.createClass({
    
    userPoolId: USER_POOL_ID,
    userPoolClientId: USER_POOL_CLIENT_ID,
    cognitoUser: undefined,
    sessionContext: undefined,
    
    getInitialState: function() {
        return {
            username: '',
            isLoading: false,
            lastError: undefined,
            verificationEmailObfuscated: undefined,
            verificationCode: '',
            newPassword: '',
            newPasswordAgain: '',
            passwordWarning: ''
        };
    },
    onUsernameChange: function(e) {
        this.setState({
            username: e.target.value
        });
    },
    onVerificationCodeChange: function(e) {
        this.setState({
            verificationCode: e.target.value
        });
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
    validateNewPassword: function(password, passwordAgain) {
        if ((password.length > 0) && (password != passwordAgain)) {
            return '! Passwords do not match';
        } else if (password.length < 6) {
            return '! Password must be at least 6 characters';
        }
        return '';
    },
    onSubmitButtonClicked: function(e) {
        e.preventDefault();
        
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
            isLoading: true,
            lastError: undefined
        });
        
        const that = this;
        this.cognitoUser.forgotPassword({
            onSuccess: function(data) {
                window.location = './signin.html';
            },
            onFailure: function(err) {
                that.setState({
                    isLoading: false,
                    lastError: err
                });
            },
            inputVerificationCode: function(data) {
                that.sessionContext = this;
                that.setState({
                    isLoading: false,
                    verificationEmailObfuscated: data.CodeDeliveryDetails.Destination
                });
            }
        });
    },
    onSetPasswordButtonClicked: function(e) {
        e.preventDefault();
        this.setState({
            isLoading: true
        });
        
        /// This doesn't work
        this.cognitoUser.confirmPassword(this.state.verificationCode, this.state.newPassword, this.sessionContext); 
    },
    render: function() {
        const canEnterNewPassword = this.state.verificationEmailObfuscated;
        
        const submitButtonDisabled = canEnterNewPassword || (this.state.username.length == 0);
        
        const newPasswordButtonDisabled =
            !canEnterNewPassword ||
            (this.state.verificationCode.length == 0) ||
            (this.state.passwordWarning.length > 0) ||
            (this.state.newPassword.length == 0) ||
            (this.state.newPassword != this.state.newPasswordAgain);
        var newPasswordFields = '';
        if (canEnterNewPassword) {
            newPasswordFields = (
                <fieldset>
                    <legend>We have sent a verification code to {this.state.verificationEmailObfuscated}.  Use that to set a new password here:</legend>
                    
                    <label htmlFor="verificationCode">Verification code</label>
                    <input id="verificationCode" type="password" onChange={this.onVerificationCodeChange} placeholder="Verification code"/>
                    
                    <label htmlFor="newPassword">Password</label>
                    <input id="newPassword" type="password" onChange={this.onNewPasswordChange} placeholder="Password"/>

                    <label htmlFor="newPasswordAgain">Password (again)</label>
                    <input id="newPasswordAgain" type="password" onChange={this.onNewPasswordAgainChange} placeholder="Password"/>
                    
                    <label style={LayoutStyles.warningTextStyle}>{this.state.passwordWarning}</label>
                    <SpinnerSubmitButton loading={this.state.isLoading}
                                         disabled={newPasswordButtonDisabled}
                                         submitButtonText='Set password'
                                         onClick={this.onSetPasswordButtonClicked}/>
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
                                <h3>Reset password</h3>
                            </legend>
                            
                            <label htmlFor="username">Username or email address</label>
                            <input id="username" onChange={this.onUsernameChange} placeholder="username" autoFocus/>
                            <span className="pure-form-message">required</span>
                        </fieldset>
                        <SpinnerSubmitButton loading={this.state.isLoading}
                                             disabled={submitButtonDisabled}
                                             onClick={this.onSubmitButtonClicked}/>
                        {newPasswordFields}
                    </form>
                </div>
            </div>
        );
    }
});


ReactDOM.render(
    <Layout>
        <PasswordReset />
    </Layout>,
    document.getElementById('app')
);