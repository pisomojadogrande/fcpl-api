import React from 'react'
import ReactDOM from 'react-dom'
import { Layout } from './layout'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const AWS = require('aws-sdk');

const SignInStyles = {
    containerStyle: {
        backgroundColor: 'navy',
        height: '600px'
    },
    signInStyle: {
        backgroundColor: 'white',
        opacity: '1.0',
        position: 'absolute',
        width: '300px',
        height: 'auto',
        left: '50%',
        marginLeft: '-150px',
        marginTop: '50px',
        padding: '10px'
    }
};

var SignIn = React.createClass({
    
    userPoolId: USER_POOL_ID,
    userPoolClientId: USER_POOL_CLIENT_ID,
    
    getInitialState: function() {
        return {
            isSignUp: false,
            username: '',
            password: ''
        };
    },
    onSignInSignUpToggleClicked: function() {
        this.setState({
            isSignUp: !this.state.isSignUp
        });
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
    onSignInSignUpButtonClicked: function(e) {
        if (this.state.isSignUp) {
            alert("Not yet implemented");
        } else {
            this.signIn();
        }
        
        // TODO actually sign in.
        //this.props.onSignInStateChanged();
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
        const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function(result) {
                alert("Success " + result.getAccessToken().getJwtToken());
            },
            onFailure: function(err) {
                alert("Failure " + err);
            },
            newPasswordRequired: function(userAttributes, requiredAttributes) {
                alert("new password required " + JSON.stringify(userAttributes));
            }
        });
    },
    render: function() {
        const legendText = this.state.isSignUp ? 'Sign up' : 'Sign in';
        const legendToggleText = this.state.isSignUp ? '(Sign in?)' : '(Sign up?)';
        const buttonText = legendText
        var bottomOfForm = (
            <label htmlFor="remember" className="pure-checkbox">
                <input id="remember" type="checkbox"/>  Remember me
            </label>
        );
        if (this.state.isSignUp) {
            bottomOfForm = (
                <div>
                    <label htmlFor="passwordRepeat">Password (again)</label>
                    <input id="passwordRepeat" type="password" placeholder="Retype password"/>
                </div>
            );
        };
        return(
            <div className="pure-u-1" style={SignInStyles.containerStyle}>
                <div style={SignInStyles.signInStyle}>
                    <form className="pure-form pure-form-stacked">
                        <fieldset>
                            <legend>
                                <h3>
                                    {legendText}   <a href="#" onClick={this.onSignInSignUpToggleClicked}>{legendToggleText}</a>
                                </h3>
                            </legend>
                            
                            <label htmlFor="username">Username or email</label>
                            <input id="username" onChange={this.onUsernameChange} placeholder="username/email" autoFocus/>
                            <span className="pure-form-message">required</span>
                            
                            <label htmlFor="password">Password</label>
                            <input id="password" type="password" onChange={this.onPasswordChange} placeholder="Password"/>
                            
                            {bottomOfForm}
                            
                            <button type="submit" className="pure-button pure-button-primary" style={{marginTop: "10px"}} onClick={this.onSignInSignUpButtonClicked}>{buttonText}</button>
                        </fieldset>
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