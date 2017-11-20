import React from 'react'
import ReactDOM from 'react-dom'
import { Layout } from './layout'
import { StatusHeader } from './controls'
import SignedInUser from './signedInUser'

import styles from './styles.css'

class ActivityLog extends React.Component {
    
    signedInUser = new SignedInUser();

    state = {
        isLoading: true,
        lastError: undefined
    };

    componentDidMount() {
        const that = this;
        this.signedInUser.authenticateOrRedirect(function(err, data) {
            if (err) {
                console.error(err);
                that.setState({
                    isLoading: false,
                    lastError: 'Error signing you in'
                });
            } else {
                console.log(`Signed in as ${data.cognitoUser.username}`);
            }
        });
    }
    
    render() {
        const tableRows = '';
        return(
            <div>
                <div className="pure-u-1-6"></div>
                <div className="pure-u-2-3">
                    <div style={{height: '25px'}}></div>
                    <StatusHeader isLoading={this.state.isLoading}
                                  lastError={this.state.lastError}/>
                    <div style={{height: '10px'}}/>
                    <table className={["pure-table", "pure-table-horizontal", styles.booksTable].join(' ')}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Change</th>
                            </tr>
                        </thead>
                        <tbody>{tableRows}</tbody>
                    </table>
                </div>
                <div className="pure-u-1-6"></div>
            </div>
        );
    }
}

const endpoint = FCPL_API_ENDPOINT;

ReactDOM.render(
    <Layout>
        <ActivityLog endpoint={endpoint}/>
    </Layout>,
    document.getElementById('app')
);

