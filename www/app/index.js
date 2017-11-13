import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Layout } from './layout'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

const IndexStyles = {
    tableStyle: {
        marginTop: '20px',
        marginBottom: '5px',
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%'
    },
    inlineIconStyle: {
        paddingRight: '3px'
    },
    errorBarStyle: {
        backgroundColor: '#c90014',
        color: 'white',
        width: '100%',
        paddingLeft: '5px',
        marginTop: '10px',
    }
};

var ErrorBar = React.createClass({
    propTypes: {
        lastError: PropTypes.string.isRequired
    },
    render: function() {
        return(
            <div style={IndexStyles.errorBarStyle}>
                <h3>{this.props.lastError}</h3>
            </div>
        );
    }
});

var LastUpdated = React.createClass({
    propTypes: {
        lastModifiedDate: PropTypes.instanceOf(Date).isRequired,
        onRefreshClicked: PropTypes.func.isRequired
    },
    render: function() {
        if (this.props.lastModifiedDate) {
            const lastUpdated = 'Last updated: ' + this.props.lastModifiedDate.toLocaleString();
            return (
                <div>
                    {lastUpdated}
                    <button style={{marginBottom: '5px', marginLeft: '5px'  }}
                            className="pure-button"
                            onClick={this.props.onRefreshClicked}>
                        <i className="fa fa-refresh" style={IndexStyles.inlineIconStyle}></i>
                        refresh
                    </button>
                </div>
            );
        } else {
            return (<div></div>);
        }
    }
});

var Spinner = React.createClass({
    render: function() {
        return(
            <div>
                <i className="fa fa-refresh fa-spin fa-fw"></i>
            </div>
        );
    }
});

var StatusHeader = React.createClass({
    propTypes: {
        isLoading: PropTypes.bool.isRequired,
        lastError: PropTypes.string
    },
    render: function() {
        if (this.props.lastError) {
            return(<ErrorBar lastError={this.props.lastError}/>);
        } else if (this.props.isLoading) {
            return(<Spinner/>);
        } else {
            return(<LastUpdated lastModifiedDate={this.props.lastModifiedDate}
                                onRefreshClicked={this.props.onRefreshClicked}/>);
        }
    }
});

var BooksTable = React.createClass({
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

    renderUserIdentity: function() {
        if (this.libraryCardNumber && this.userName) {
            return(
                <div>
                    Logged in as {this.userName} ({this.libraryCardNumber}).  <a href="./signin.html">Sign out</a>
                </div>
            );
        } else {
            return '';
        }
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
                <div>
                    {this.renderUserIdentity()}
                </div>
                <div style={{float: 'right'}}>
                    <StatusHeader isLoading={this.state.isLoading}
                                  lastError={this.state.lastError}
                                  lastModifiedDate={this.state.lastModifiedDate}
                                  onRefreshClicked={this.onRefreshClicked}/>
                </div>
                <table className="pure-table pure-table-horizontal" style={IndexStyles.tableStyle}>
                    <thead>
                        <tr>
                            <th>Book title</th>
                            <th>Due date</th>
                            <th>Renewals</th>
                        </tr>
                    </thead>
                    <tbody>{tableRows}</tbody>
                </table>
            </div>
        );
    }
});

const endpoint = FCPL_API_ENDPOINT;
ReactDOM.render(
    <Layout>
        <div className="pure-u-1-6"></div>
        <div className="pure-u-2-3">
            <BooksTable endpoint={endpoint}/>
        </div>
        <div className="pure-u-1-6"></div>
    </Layout>,
    document.getElementById('app')
);

