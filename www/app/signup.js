import React from 'react'
import ReactDOM from 'react-dom'
import { Layout } from './layout'
import { SpinnerSubmitButton } from './controls'

import styles from './styles.css'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

var SignUp = React.createClass({
    
    userPoolId: USER_POOL_ID,
    userPoolClientId: USER_POOL_CLIENT_ID,
    
    getInitialState: function() {
        return {
            username: '',
            email: '',
            password: '',
            passwordAgain: '',
            loading: false,
            warning: '',
            cognitoUser: undefined,
            verificationCode: '',
            lastError: undefined
        }
    },
        
    onUsernameChange: function(e) {
        this.setState({
            username: e.target.value
        });
    },
    onEmailChange: function(e) {
        this.setState({
            email: e.target.value
        });
    },
    onPasswordChange: function(e) {
        this.setState({
            password: e.target.value,
            warning: this.validatePassword(e.target.value, this.state.passwordAgain)
        });
    },
    onPasswordAgainChange: function(e) {
        this.setState({
            passwordAgain: e.target.value,
            warning: this.validatePassword(this.state.password, e.target.value)
        });
    },
    validatePassword: function(password, passwordAgain) {
        if ((password.length > 0) && (password != passwordAgain)) {
            return '! Passwords do not match';
        } else if (password.length < 6) {
            return '! Password must be at least 6 characters';
        }
        return '';
    },
    onVerificationCodeChange: function(e) {
        this.setState({
            verificationCode: e.target.value
        });
    },
    
    onSignUpButtonClicked: function(e) {
        e.preventDefault();
        
        this.setState({
            loading: true
        });
        const poolData = {
            UserPoolId: USER_POOL_ID,
            ClientId: USER_POOL_CLIENT_ID
        };
        const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        
        const attributeList = [
            new AmazonCognitoIdentity.CognitoUserAttribute({
                Name: 'email',
                Value: this.state.email
            })
        ];
        
        const that = this;
        userPool.signUp(this.state.username, this.state.password, attributeList, null, function(err, result) {
            that.setState({
                loading: false,
                cognitoUser: result ? result.user : undefined,
                lastError: err ? err.message : undefined
            });
        });
    },
    
    onVerificationCodeSubmitButtonClicked: function(e) {
        e.preventDefault();
        
        this.setState({
            loading: true
        });
        
        const that = this;
        this.state.cognitoUser.confirmRegistration(this.state.verificationCode, true, function(err, result) {
            that.setState({
                loading: false,
                lastError: err ? err.message : undefined
            });
            if (result) {
                window.location = './signin.html?username=' + that.state.cognitoUser.username;
            }
        });
    },
    
    renderConfirmationPart: function() {
        if (this.state.cognitoUser) {
            const submitButtonDisabled = (this.state.verificationCode.length == 0);
            return(
                <fieldset>
                    <label htmlFor="verificationCode">We sent a verification code to {this.state.email}.  Please enter it here:</label>
                    <input id="verificationCode" onChange={this.onVerificationCodeChange} placeholder="123456"/>
                    <span className="pure-form-message">required</span>
                    <SpinnerSubmitButton loading={this.state.loading}
                                         disabled={submitButtonDisabled}
                                         onClick={this.onVerificationCodeSubmitButtonClicked}/>
                </fieldset>
            );
        } else return '';
    },

    render: function() {
        var errorBar = '';
        if (this.state.lastError) {
            errorBar = (
                <div className={styles.errorBar}>
                    <h3>{this.state.lastError}</h3>
                </div>
            );
        }
        const submitButtonDisabled = (this.state.username.length == 0) ||
                                     (this.state.password.length == 0) ||
                                     (this.state.email.length == 0) ||
                                     (this.state.warning.length > 0) ||
                                     !!this.state.cognitoUser;
        return(
            <div className={["pure-u-1", styles.centerModal].join(' ')}>
                <div className={styles.centerForm}>
                    <form className="pure-form pure-form-stacked">
                        <fieldset>
                            {errorBar}
                            <legend>
                                <h3>Sign up</h3>
                            </legend>
                            
                            <label htmlFor="username">Username</label>
                            <input id="username" onChange={this.onUsernameChange} placeholder="username" autoFocus/>
                            <span className="pure-form-message">required</span>
                            
                            <label htmlFor="email">Email address</label>
                            <input id="email" onChange={this.onEmailChange} placeholder="you@domain.com"/>
                            <span className="pure-form-message">required</span>
                            
                            <label htmlFor="password">Password</label>
                            <input id="password" type="password" onChange={this.onPasswordChange} placeholder="Password"/>
                            <span className="pure-form-message">required</span>
              
                            <label htmlFor="passwordAgain">Repeat password</label>
                            <input id="passwordAgain" type="password" onChange={this.onPasswordAgainChange} placeholder="Repeat password"/>
                            <span className="pure-form-message">required</span>
                        
                            <label className={styles.warning}>{this.state.warning}</label>
                            <SpinnerSubmitButton loading={this.state.loading}
                                                 disabled={submitButtonDisabled}
                                                 submitButtonText='Sign up'
                                                 onClick={this.onSignUpButtonClicked}/>
                        </fieldset>
                        {this.renderConfirmationPart()}
                    </form>
                </div>
            </div>
        );
    }

});

ReactDOM.render(
    <Layout>
        <SignUp />
    </Layout>,
    document.getElementById('app')
);