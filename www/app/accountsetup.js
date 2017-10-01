import React from 'react'
import ReactDOM from 'react-dom'
import { Layout, LayoutStyles } from './layout'

var AccountSetup = React.createClass({
    getInitialState: function() {
        return {
            libraryCardNumber: '',
            libraryCardNumberValid: false,
            libraryPassword: '',
            libraryPasswordValid: false,
            loading: false,
            lastError: undefined
        };
    },
    onLibraryCardNumberChange: function(e) {
        this.setState({
            libraryCardNumber: e.target.value,
            libraryCardNumberValid: e.target.checkValidity()
        });
    },
    onLibraryPasswordChange: function(e) {
        this.setState({
            libraryPassword: e.target.value,
            libraryPasswordValid: e.target.checkValidity()
        });
    },
    onSubmitButtonClicked: function(e) {
        e.preventDefault();
        this.startPutUser();
    },
    startPutUser: function() {
        this.setState({
            loading: true
        });
        
        const req = new XMLHttpRequest();
        const that = this;
        req.addEventListener('load', function() {
            if (this.status == 200) {
                window.location = './index.html?token=' + that.props.token;
            } else {
                finishPutUserError('Error setting up account: ' + this.responseText);
            }
        });
        req.addEventListener('error', function(e) {
            that.finishPutUserError('Unexpected error');
        });
        var url = this.props.endpoint +
                  '/user?libraryCardNumber=' + this.state.libraryCardNumber +
                  '&libraryPassword=' + this.state.libraryPassword;
        req.open('POST', url);
        req.setRequestHeader('Authorization', this.props.token);
        req.send();
    },
    finishPutUserError: function(err) {
        this.setState({
            loading: false,
            lastError: err
        });
    },
    render: function() {
        const submitButtonDisabled = this.state.loading ||
                                     !this.state.libraryCardNumberValid ||
                                     !this.state.libraryPasswordValid;
        var spinner = '';
        if (this.state.loading) {
            spinner = (
                <i display={displaySpinner}
                    className="fa fa-refresh fa-spin fa-fw">
                </i>
            );
        }
        const displaySpinner = this.state.loading ? 'block' : 'none';
        const displayError = this.state.lastError ? 'block' : 'none';
        return( 
            <div className="pure-u-1" style={LayoutStyles.centerModalStyle}>
                <div style={LayoutStyles.centerFormStyle}>
                    <div style={LayoutStyles.errorBarStyle} display={displayError}>
                        <h3>{this.state.lastError}</h3>
                    </div>
                    <form className="pure-form pure-form-stacked">
                        <fieldset>
                            <legend>
                                <h3>Looks like you're new here!</h3>
                                <p>Please set up your library account details</p>
                            </legend>
                            
                            <label htmlFor="libraryCardNumber">Library card number</label>
                            <input id="libraryCardNumber"
                                   onChange={this.onLibraryCardNumberChange}
                                   placeholder="2276901234567890123"
                                   pattern="[0-9]{14}"
                                   required
                                   autoFocus/>
                            <span className="pure-form-message">required</span>
                            
                            <label htmlFor="libraryPassword">Password / PIN</label>
                            <input id="libraryPassword"
                                   type="password"
                                   onChange={this.onLibraryPasswordChange}
                                   placeholder="1111"
                                   required/>
                            <span className="pure-form-message">required</span>
                            
                        </fieldset>
                        <button type="submit"
                                disabled={submitButtonDisabled}
                                className="pure-button pure-button-primary"
                                style={{marginTop: "10px"}}
                                onClick={this.onSubmitButtonClicked}>
                            Submit
                        </button>
                        {spinner}
                    </form>
                </div>
            </div>
        );
    }
});

const endpoint = FCPL_API_ENDPOINT;

// TODO: Move to a cookie
const url = new URL(window.location.href);
const jwtToken = url.searchParams.get('token');

ReactDOM.render(
    <Layout>
        <AccountSetup token={jwtToken} endpoint={endpoint}/>
    </Layout>,
    document.getElementById('app')
);