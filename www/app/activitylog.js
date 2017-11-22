import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Layout } from './layout'
import { StatusHeader } from './controls'
import SignedInUser from './signedInUser'

import styles from './styles.css'

const PAGE_SIZE = 20;


class ActivityLog extends React.Component {
    
    
    signedInUser = new SignedInUser();

    state = {
        isLoading: true,
        lastError: undefined,
        events: [],
        expandIndex: undefined
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
        var getUserActivityUrl = this.props.endpoint + '/user/activity?pageSize=' + PAGE_SIZE;
        if (this.state.nextContinuationToken) {
            getUserActivityUrl += '&continuationToken=' +
                encodeURIComponent(this.state.nextContinuationToken);
        }
        
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
                events: that.state.events.concat(result.events),
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
    
    onTableRowClick(rowIndex) {
        this.setState({
           expandIndex: rowIndex
        });
    }
    
    expandList(heading, itemsList) {
        if (itemsList && (itemsList.length > 0)) {
            const listItems = itemsList.map((item) => {
                var itemNameCleaned = item.name.replace(/&nbsp;/g, '');
                var wasDue = '';
                if (item.previousDueDate) {
                    wasDue = ` (was ${(new Date(item.previousDueDate)).toLocaleDateString()})`;
                }
                return(
                    <li>
                        <div>
                            {itemNameCleaned}
                            <br/>
                            Due: {(new Date(item.dueDate)).toLocaleDateString()}{wasDue}
                        </div>
                    </li>
                );
            });
            return(
                <div>
                    <b>{heading}</b>
                    <ul>{listItems}</ul>
                </div>
            );
        } else return '';
    }
    
    onMoreButtonClick() {
        this.setState({
            isLoading: true
        });
        this.fetchUserActivity();
    }
    
    render() {
        const that = this;
        const tableRows = this.state.events.map((event, rowIndex) => {
            const onRowClick = function() {
                that.onTableRowClick(rowIndex)
            };
            
            var changeDescription = this.eventToChangeDescription(event);
            if (rowIndex == this.state.expandIndex) {
                changeDescription = (
                    <div>
                        {changeDescription}
                        <div style={{height: '10px'}}/>
                        {this.expandList('You took out:', event.newItems)}
                        {this.expandList('You returned:', event.deletedItems)}
                        {this.expandList('You renewed:', event.changedItems)}
                    </div>
                );
            }
            const timestampDate = new Date(event.timestamp);
            const snapshotRef = './snapshot.html?timestamp=' + Math.round(timestampDate.getTime() / 1000);
            return(
                <tr key={event.timestamp} onClick={onRowClick}>
                    <td style={{width: '35%'}}>
                        <a href={snapshotRef}>{timestampDate.toLocaleString()}</a>
                    </td>
                    <td>{changeDescription}</td>
                </tr>
            );
        });
        var moreButton = '';
        if (this.state.nextContinuationToken) {
            const buttonClasses = [styles.button, styles.buttonFullWidth];
            if (this.state.isLoading) {
                buttonClasses.push('pure-button-disabled');
            }
            moreButton = (
                <button className={buttonClasses.join(' ')}
                        style={{marginTop: '5px'}}
                        onClick={this.onMoreButtonClick.bind(this)}>
                    ...More...
                </button>               
            );
        }
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
                    {moreButton}
                    <div style={{height: '25px'}}/>
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

