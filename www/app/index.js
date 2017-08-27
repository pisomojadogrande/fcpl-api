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

