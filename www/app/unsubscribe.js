import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'

import styles from './styles.css'

class Unsubscribe extends React.Component {
    state = {
        loading: true,
        error: undefined
    };
    
    componentDidMount() {
        if (!(this.props.userId && this.props.expires && this.props.hash)) {
            this.setState({
                loading: false,
                error: 'Invalid request'
            });
        } else {
            const unsubscribeUrl = this.props.endpoint +
                                   '/user/' +
                                   this.props.userId +
                                   '/unsubscribe?expires=' +
                                   this.props.expires +
                                   '&hash=' +
                                   this.props.hash;
            fetch(unsubscribeUrl, {method: 'POST'}).then((res) => {
                const newState = {
                    loading: false
                };
                if (res.status != 200) {
                    newState.error = "We weren't able to unsubscribe you; please try again later"
                }
                this.setState(newState);
            }).catch((err) => {
                this.setState({
                    loading: false,
                    error: "Unexpected error"
                });
            });
        }
    }
    
    render() {
        var statusText;
        var icon;
        const accountUrl = 'https://' + this.props.hostname + '/account.html';
        var linkToAccountUrl = <a href="./account.html">More account setup options</a>;
        if (this.state.loading) {
            statusText = 'Unsubscribing...';
            icon = 'fa-refresh fa-spin fa-fw';
            linkToAccountUrl = '';
        } else if (this.state.error) {
            statusText = 'Error: ' + this.state.error;
            icon = 'fa-exclamation-triangle';
        } else {
            statusText = 'Done!';
            icon = 'fa-hand-peace-o';
        }
        const iconClass = 'fa ' + icon + ' fa-3x';
        return(
            <div>
                <i className={iconClass} style={{margin: '20px'}}></i>
                <div style={{display: 'inline-block'}}>
                    {statusText}<br/>
                    {linkToAccountUrl}
                </div>
            </div>
        );
    }
}

Unsubscribe.propTypes = {
    endpoint: PropTypes.string.isRequired,
    userId: PropTypes.string,
    expires: PropTypes.string,
    hash: PropTypes.string
};

const endpoint = FCPL_API_ENDPOINT;

const url = new URL(window.location.href);
const userId = url.searchParams.get('userId');
const expires = url.searchParams.get('expires');
const hash = url.searchParams.get('hash');

ReactDOM.render(
    <Unsubscribe endpoint={endpoint}
                 userId={userId}
                 expires={expires}
                 hash={hash}/>,
    document.getElementById('app')
);

