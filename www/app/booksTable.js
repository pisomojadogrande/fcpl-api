import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { StatusHeader } from './controls'

import styles from './styles.css'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

export const BooksTable = React.createClass({
    libraryCardNumber: undefined,
    libraryPassword: undefined,
    userName: undefined,
    loadingState: {
        isLoading: true,
        books: [
            {
                title: '---',
                timesRenewed: '---',
                dueDate: '---',
                key: 'LOADING_KEY'
            }
        ],
        lastModifiedDate: undefined,
        lastError: undefined
    },
    getInitialState: function() {
        return this.loadingState;
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
    redirectToSignin: function() {
        window.location = './signin.html';
    },
    startGetUser: function(jwtToken) {
        const req = new XMLHttpRequest();
        const that = this;
        req.addEventListener('load', function() {
            if (this.status == 200) {
                const response = JSON.parse(this.responseText);
                that.libraryCardNumber = response.libraryCardNumber;
                that.libraryPassword = response.libraryPassword;
                that.userName = response.userName;
                that.startLoad(false);
            } else if (this.status == 401) {
                that.redirectToSignin();
            } else if (this.status == 404) {
                window.location = './accountsetup.html';
            } else {
                that.setState({
                    isLoading: false,
                    lastError: 'Error retrieving your info: ' + this.status + ': Please try again later'
                });
            }
        });
        req.addEventListener('error', function(e) {
            that.setState({
                isLoading: false,
                lastError: 'Error retrieving your info.  Please try again later: ' + e
            });
        });
        var url = this.props.endpoint + '/user';
        req.open('GET', url);
        req.setRequestHeader('Authorization', jwtToken);
        req.send();
    },
    startLoad: function(forceRefresh) {
        const req = new XMLHttpRequest();
        const that = this;
        req.addEventListener('load', function() {
            const response = JSON.parse(this.responseText);
            that.setState({
                isLoading: false,
                books: that.getBooksResponseToBooks(response),
                lastModifiedDate: new Date(response.lastModified),
                lastError: undefined
            });
        });
        req.addEventListener('error', function(e) {
            that.setState({
                isLoading: false,
                lastError: 'Error fetching books.  Please try again later.'
            });
        });
        var url = this.props.endpoint + '/books?libraryCardNumber='
            + this.libraryCardNumber
            + '&libraryPassword='
            + this.libraryPassword;
        if (forceRefresh) {
            url += '&forceRefresh=true';
        }
        req.open('GET', url);
        req.send();
    },
    getBooksResponseToBooks: function(response) {
        return response.libraryItems.map((item) => {
            const friendly = item.friendly.replace(/&nbsp;/g, '');
            const dueDate = new Date(item.dueDate);
            return {
                key: item.renewId,
                title: friendly, 
                dueDate: dueDate.toLocaleDateString(),
                timesRenewed: item.timesRenewed || 0
            };
        });
    },

    onRefreshClicked: function() {
        this.startLoad(true);
        this.setState(this.loadingState);
    },

    render: function() {
        var tableRows = this.state.books.map((book) => {
            return(
                <tr key={book.key}>
                    <td>{book.title}</td>
                    <td>{book.dueDate}</td>
                    <td>{book.timesRenewed}</td>
                </tr>
            );
        });
        
        return(
            <div>
                <div style={{height: '10px'}}/>
                <div>
                    <StatusHeader isLoading={this.state.isLoading}
                                  lastError={this.state.lastError}
                                  lastModifiedDate={this.state.lastModifiedDate}
                                  onRefreshClicked={this.onRefreshClicked}/>
                </div>
                <div style={{height: '10px'}}/>
                <table className={["pure-table", "pure-table-horizontal", styles.booksTable].join(' ')}>
                    <thead>
                        <tr>
                            <th>Book title</th>
                            <th>Due date</th>
                            <th>Renewals</th>
                        </tr>
                    </thead>
                    <tbody>{tableRows}</tbody>
                </table>
                <div style={{height: '25px'}}/>
            </div>
        );
    }
});
