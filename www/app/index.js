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
    }
};

var BooksTable = React.createClass({
    getInitialState: function() {
        return {
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
        };
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
    componentDidMount: function() {
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
        req.open('GET', this.props.endpoint + '/books');
        req.send();
    },
    onBooksLoaded: function() {
        
    },
    render: function() {
        var spinner = <i className="fa fa-refresh fa-spin fa-fw"></i>;
        var headerCol0 = this.state.isLoading ? spinner : null;
        var tableRows = this.state.books.map((book) => {
            var col0;
            if (this.state.isLoading) {
                col0 = spinner;
            } else {
                col0 = (
                    <button className="pure-button pure-button-disabled">
                        <i className="fa fa-thumbs-up" style={{paddingRight: '3px'}}></i>
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

var Main = React.createClass({
    render: function() {
        return (
            <div className="pure-g">
                <div className="pure-u-1" style={Styles.titlebarStyle}>
                    <h1>Your Books</h1>
                </div>
                <div className="pure-u-1-8" style={Styles.sidebarStyle}>
                </div>
                <div className="pure-u-1-8"></div>
                <div className="pure-u-1-2">
                    <BooksTable endpoint={this.props.endpoint}/>
                </div>
                <div className="pure-u-1-8"></div>
                <div className="pure-u-1-8" style={Styles.sidebarStyle}>
                </div>
            </div>
        )
    }
});

const appElement = document.getElementById('app');
const endpointText = document.getElementById('endpointText').innerHTML.trim();
ReactDOM.render(<Main endpoint={endpointText} />, appElement);
