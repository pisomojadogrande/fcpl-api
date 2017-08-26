import React from 'react'
import ReactDOM from 'react-dom'
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

const Styles = {
    titlebarStyle: {
        backgroundColor: 'lawngreen',
        color: 'midnightblue',
        width: '100%',
        textAlign: 'center'
    },
    sidebarStyle: { 
        backgroundColor: 'purple',
        color: 'white'
    },
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
    overlayStyle: {
        backgroundColor: 'navy',
        //opacity: '0.9',
        position: 'absolute',
        left: '0px',
        top: '0px',
        height: '100%',
        width: '100%'
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

var BooksTable = React.createClass({
    loadingState: {
        isLoading: true,
        books: [
            {
                title: 'loading',
                timesRenewed: 0,
                dueDate: 'loading',
                key: 'LOADING_KEY'
            }
        ],
        lastModified: 'unknown'
    },
    getInitialState: function() {
        return this.loadingState;
    },
    getBooksResponseToBooks: function(response) {
        return response.libraryItems.map((item) => {
            const friendly = item.friendly.replace(/&nbsp;/g, '');
            const dueDate = new Date(item.dueDate);
            return {
                key: item.renewId,
                title: friendly, 
                dueDate: dueDate.toDateString(),
                timesRenewed: item.timesRenewed || 0
            };
        });
    },
    startLoad: function(forceRefresh) {
        const req = new XMLHttpRequest();
        const that = this;
        req.addEventListener('load', function() {
            const response = JSON.parse(this.responseText);
            that.setState({
                isLoading: false,
                books: that.getBooksResponseToBooks(response),
                lastModified: (new Date(response.lastModified)).toString()
            });
        });
        var url = this.props.endpoint + '/books';
        if (forceRefresh) {
            url += '?forceRefresh=true';
        }
        req.open('GET', url);
        req.send();
    },
    componentDidMount: function() {
        this.startLoad();
    },
    onRefreshClicked: function() {
        this.startLoad(true);
        this.setState(this.loadingState);
    },
    render: function() {
        var spinner = <i className="fa fa-refresh fa-spin fa-fw"></i>;
        var refreshButton = (
            <button className="pure-button" onClick={this.onRefreshClicked}>
                <i className="fa fa-refresh" style={Styles.inlineIconStyle}></i>
                refresh
            </button>
        );
        var headerCol0 = this.state.isLoading ? spinner : refreshButton;
        var tableRows = this.state.books.map((book) => {
            var col0;
            if (this.state.isLoading) {
                col0 = spinner;
            } else {
                col0 = (
                    <button className="pure-button pure-button-disabled">
                        <i className="fa fa-thumbs-up" style={Styles.inlineIconStyle}></i>
                        renew
                    </button>
                );
            }

            return(
                <tr key={book.key}>
                    <td>{col0}</td>
                    <td>{book.title}</td>
                    <td>{book.dueDate}</td>
                    <td>{book.timesRenewed}</td>
                </tr>
            );
        });
        return(
            <div>
                <table className="pure-table" style={Styles.tableStyle}>
                    <thead>
                        <tr>
                            <th>{headerCol0}</th>
                            <th>Book title</th>
                            <th>Due date</th>
                            <th>Times renewed</th>
                        </tr>
                    </thead>
                    <tbody>{tableRows}</tbody>
                </table>
                <div style={{textAlign: 'right'}}>
                    Last modified: {this.state.lastModified}
                </div>
            </div>
        );
    }
});

var SignInOverlay = React.createClass({
    getInitialState: function() {
        return {
            isSignUp: false,
            email: '',
            password: ''
        };
    },
    onSignInSignUpToggleClicked: function() {
        this.setState({
            isSignUp: !this.state.isSignUp
        });
    },
    onEmailChange: function(e) {
        this.setState({
            email: e.target.value
        });
    },
    onPasswordChange: function(e) {
        this.setState({
            password: e.target.value
        });
    },
    onSignInSignUpButtonClicked: function(e) {
        alert("email=" + this.state.email + " password=" + this.state.password);
        // TODO actually sign in.
        //this.props.onSignInStateChanged();
    },
    render: function() {
        if (this.props.show) {
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
                <div className="pure-u-1" style={Styles.overlayStyle}>
                    <div style={Styles.signInStyle}>
                        <form className="pure-form pure-form-stacked">
                            <fieldset>
                                <legend>
                                    <h3>
                                        {legendText}   <a href="#" onClick={this.onSignInSignUpToggleClicked}>{legendToggleText}</a>
                                    </h3>
                                </legend>
                                
                                <label htmlFor="email">Email</label>
                                <input id="email" type="email" onChange={this.onEmailChange} placeholder="Email" autoFocus/>
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
        } else {
            return(<div/>);
        }
    }
});

var Main = React.createClass({
    getInitialState: function() {
        return {
            needSignIn: true
        };
    },
    onSignInStateChanged: function() {
        this.setState({
            needSignIn: false
        });
    },
    render: function() {
        const endpoint = FCPL_API_ENDPOINT;
        return (
            <div className="pure-g">
                <div className="pure-u-1" style={Styles.titlebarStyle}>
                    <h1>Your Books</h1>
                </div>
                <div className="pure-u-1-8" style={Styles.sidebarStyle}>
                </div>
                <div className="pure-u-1-8"></div>
                <div className="pure-u-1-2">
                    <BooksTable endpoint={endpoint}/>
                    <SignInOverlay show={this.state.needSignIn} onSignInStateChanged={this.onSignInStateChanged}/>
                </div>
                <div className="pure-u-1-8"></div>
                <div className="pure-u-1-8" style={Styles.sidebarStyle}>
                </div>
            </div>
        )
    }
});

ReactDOM.render(<Main />, document.getElementById('app'));
