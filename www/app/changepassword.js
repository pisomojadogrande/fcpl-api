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

var ChangePassword = React.createClass({
    getInitialState: function() {
        return {
            password: '',
            passwordAgain: ''
        };
    },
    onPasswordChange: function(e) {
        this.setState({
            password: e.target.value
        });
    },
    onPasswordAgainChange: function(e) {
        this.setState({
            passwordAgain: e.target.value
        });
    },
    onSubmit: function(e) {
        e.preventDefault();
        const poolData = {
            UserPoolId: USER_POOL_ID,
            ClientId: USER_POOL_CLIENT_ID
        };
        const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        const userData = {
            Username: this.props.username,
            Pool: userPool
        };
        const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        const userAttributes = {
            email: this.props.email
        };
        cognitoUser.completeNewPasswordChallenge(this.state.password, userAttributes, {
            onSuccess: function() {
                alert('success');
            },
            onFailure: function(err) {
                alert('Failure ' + err);
            }
        });
    },
    render: function() {
        var passwordMismatchWarning = '';
        var submitDisabled = false;
        if ((this.state.password.length > 0) && (this.state.password != this.state.passwordAgain)) {
            passwordMismatchWarning = <label style={Styles.warningStyle}>! Passwords do not match</label>;
            submitDisabled = true;
        }
        return(
            <div className="pure-u-1" style={LayoutStyles.centerModalStyle}>
                <div style={LayoutStyles.centerFormStyle}>
                    <form className="pure-form pure-form-stacked">
                        <fieldset>
                            <legend>
                                <h3>Password change required for {this.props.email}</h3>
                            </legend>
                            
                            <label htmlFor="password">Password</label>
                            <input id="password" type="password" onChange={this.onPasswordChange} placeholder="Password"/>

                            <label htmlFor="passwordAgain">Password (again)</label>
                            <input id="passwordAgain" type="password" onChange={this.onPasswordAgainChange} placeholder="Password"/>
                            
                            {passwordMismatchWarning}
                            
                            <button type="submit" disabled={submitDisabled} className="pure-button pure-button-primary" style={{marginTop: "10px"}} onClick={this.onSubmit}>Submit</button>
                        </fieldset>
                    </form>
                </div>
            </div>
        );
    }
});

const getParams = query => {
  if (!query) {
    return { };
  }

  return (/^[?#]/.test(query) ? query.slice(1) : query)
    .split('&')
    .reduce((params, param) => {
      let [ key, value ] = param.split('=');
      params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
      return params;
    }, { });
};

const queryParams = getParams(window.location.search);
ReactDOM.render(
    <Layout>
        <ChangePassword username={queryParams.username} email={queryParams.email}/>
    </Layout>,
    document.getElementById('app')
);