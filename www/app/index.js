import React from 'react'
import ReactDOM from 'react-dom'

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
        opacity: '0.5',
        position: 'absolute',
        left: '0px',
        top: '0px',
        height: '100%',
        width: '100%'
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
    render: function() {
        if (this.props.show) {
            return(
                <div className="pure-u-1" style={Styles.overlayStyle}/>  
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
                    <SignInOverlay show={this.state.needSignIn}/>
                </div>
                <div className="pure-u-1-8"></div>
                <div className="pure-u-1-8" style={Styles.sidebarStyle}>
                </div>
            </div>
        )
    }
});

ReactDOM.render(<Main />, document.getElementById('app'));
