import React from 'react'
import ReactDOM from 'react-dom'
import { Layout, LayoutStyles } from './layout'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const AWS = require('aws-sdk');

var SignIn = React.createClass({
    
    userPoolId: USER_POOL_ID,
    userPoolClientId: USER_POOL_CLIENT_ID,
    
    getInitialState: function() {
        return {
            username: '',
            password: ''
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
    onSignInButtonClicked: function(e) {
        e.preventDefault();
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
                //alert('userAttributes=' + JSON.stringify(userAttributes) + '; requiredAttributes=' + JSON.stringify(requiredAttributes));
                window.location = "./changepassword.html?username=" + userData.Username + "&email=" + userAttributes.email;
            }
        });
    },
    render: function() {
        const legendText = 'Sign in';
        const buttonText = legendText
        return(
            <div className="pure-u-1" style={LayoutStyles.centerModalStyle}>
                <div style={LayoutStyles.centerFormStyle}>
                    <form className="pure-form pure-form-stacked">
                        <fieldset>
                            <legend>
                                <h3>{legendText}</h3>
                            </legend>
                            
                            <label htmlFor="username">Username or email</label>
                            <input id="username" onChange={this.onUsernameChange} placeholder="username/email" autoFocus/>
                            <span className="pure-form-message">required</span>
                            
                            <label htmlFor="password">Password</label>
                            <input id="password" type="password" onChange={this.onPasswordChange} placeholder="Password"/>
                            
                            <label htmlFor="remember" className="pure-checkbox">
                                <input id="remember" type="checkbox" disabled="true"/>  Remember me
                            </label>
                            
                            <button type="submit" className="pure-button pure-button-primary" style={{marginTop: "10px"}} onClick={this.onSignInButtonClicked}>{buttonText}</button>
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