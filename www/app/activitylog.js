import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Layout } from './layout'
import { StatusHeader } from './controls'
import SignedInUser from './signedInUser'

import styles from './styles.css'

class ActivityLog extends React.Component {
    
    signedInUser = new SignedInUser();

    state = {
        isLoading: true,
        lastError: undefined,
        events: []
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
                that.fetchUserActivity();
            }
        });
    }
    
    fetchUserActivity() {
        const getUserActivityUrl = this.props.endpoint + '/user/activity?pageSize=15';
        const headers = new Headers();
        headers.append('Authorization', this.signedInUser.jwtToken);
        const that = this;
        fetch(getUserActivityUrl, {headers: headers}).then((res) => {
            if (res.status == 200) {
                return res.json();
            } else {
                that.setState({
                    isLoading: false,
                    lastError: `Error ${res.status}: ${res.statusText}`
                });
            }
        }).then((result) => {
            console.log(`Retrieved ${result.events.length} events, continuation token ${result.nextContinuationToken}`);
            that.setState({
                isLoading: false,
                events: result.events,
                nextContinuationToken: result.nextContinuationToken
            });
        }).catch((err) => {
            console.error(err);
            that.setState({
                isLoading: false,
                lastError: 'Failed to fetch your activity; please try again later'
            });
        });
    }
    
    eventToChangeDescription(event) {
        const newItemsCount = event.newItems ? event.newItems.length : 0;
        const deletedItemsCount = event.deletedItems ? event.deletedItems.length : 0;
        const changedItemsCount = event.changedItems ? event.changedItems.length : 0;
        return `${newItemsCount} new items; returned ${deletedItemsCount} items; ${changedItemsCount} items renewed`;
    }
    
    render() {
        const tableRows = this.state.events.map((event) => {
            return(
                <tr key={event.timestamp}>
                    <td>{(new Date(event.timestamp)).toLocaleString()}</td>
                    <td>{this.eventToChangeDescription(event)}</td>
                </tr>
            );
        });
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

ActivityLog.propTypes = {
    endpoint: PropTypes.string.isRequired,
};

const endpoint = FCPL_API_ENDPOINT;

ReactDOM.render(
    <Layout>
        <ActivityLog endpoint={endpoint}/>
    </Layout>,
    document.getElementById('app')
);

