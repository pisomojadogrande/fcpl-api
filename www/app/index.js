import React from 'react'
import ReactDOM from 'react-dom'
import { Layout } from './layout'

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
        marginTop: '10px'
    }
};

var BooksTable = React.createClass({
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
        lastModified: 'unknown',
        lastError: undefined
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
                lastModified: (new Date(response.lastModified)).toString(),
                lastError: undefined
            });
        });
        req.addEventListener('error', function(e) {
            that.setState({
                isLoading: false,
                lastError: 'Error fetching books.  Please try again later.'
            });
        });
        var url = this.props.endpoint + '/books';
        if (forceRefresh) {
            url += '?forceRefresh=true';
        }
        req.open('GET', url);
        req.send();
    },
    startGetUser: function(jwtToken) {
        const req = new XMLHttpRequest();
        const that = this;
        req.addEventListener('load', function() {
            if (this.status == 200) {
                const response = JSON.parse(this.responseText);
                alert(this.responseText);
                // TODO fetch bookds from here
            } else if (this.status == 401) {
                window.location = './signin.html';
            } else if (this.status == 404) {
                window.location = './accountsetup.html?token=' + jwtToken;
            } else {
                that.setState({
                    // TODO isLoading: false
                    lastError: 'Error retrieving your info: ' + this.status + ': Please try again later'
                });
            }
        });
        req.addEventListener('error', function(e) {
            alert('onError ' + req.status);
            that.setState({
                // TODO isLoading: false,
                lastError: 'Error retrieving your info.  Please try again later: ' + e
            });
        });
        var url = this.props.endpoint + '/user';
        req.open('GET', url);
        req.setRequestHeader('Authorization', jwtToken);
        req.send();
    },
    componentDidMount: function() {
        const jwtToken = document.cookie.replace(/(?:(?:^|.*;\s*)idToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        if (!jwtToken) {
            window.location = './signin.html';
        } else {
            this.startGetUser(jwtToken);
        }
        
        // TODO: Don't start this until after getting the user
        this.startLoad();
    },
    onRefreshClicked: function() {
        this.startLoad(true);
        this.setState(this.loadingState);
    },
    render: function() {
        var spinner = <i className="fa fa-refresh fa-spin fa-fw"></i>;
        var errorDisplay = this.state.lastError ? 'block' : 'none';
        var refreshButton = (
            <button className="pure-button" onClick={this.onRefreshClicked}>
                <i className="fa fa-refresh" style={IndexStyles.inlineIconStyle}></i>
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
                        <i className="fa fa-thumbs-up" style={IndexStyles.inlineIconStyle}></i>
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
                <div style={IndexStyles.errorBarStyle} display={errorDisplay}>
                    <h3>{this.state.lastError}</h3>
                </div>
                <table className="pure-table" style={IndexStyles.tableStyle}>
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

