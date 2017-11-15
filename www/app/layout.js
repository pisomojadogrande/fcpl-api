import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'

import styles from './styles.css'

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

const UserAccountMenu = React.createClass({
    propTypes: {
        username: PropTypes.string
    },
    getInitialState: function() {
        return {
            showMenu: false
        };
    },
    onMenuHeaderClicked: function() {
        console.log('Toggle menu ' + !this.state.showMenu);
        this.setState({
            showMenu: !this.state.showMenu
        });
    },
    render: function() {
        if (this.props.username) {
            return(
                <div className={styles.accountMenu}>
                    <button className={["pure-button", styles.accountMenuButton].join(' ')}
                            onClick={this.onMenuHeaderClicked}>
                        <i className={["fa", "fa-caret-square-o-down", styles.inlineIcon].join(' ')}></i>
                        {this.props.username}
                    </button>
                </div>
            );
        } else return(<div/>);
    }
});

export const Layout = React.createClass({
    getInitialState: function() {
        return {
            username: undefined
        };
    },
    componentDidMount: function() {
        const cognitoUserPool = new AmazonCognitoIdentity.CognitoUserPool({
            UserPoolId: USER_POOL_ID,
            ClientId: USER_POOL_CLIENT_ID
        });
        const cognitoUser = cognitoUserPool.getCurrentUser();
        if (cognitoUser) {
            this.setState({
                username: cognitoUser.username
            });
        }
    },
    render: function() {
        return (
            <div className="pure-g">
                <div className={["pure-u-1", styles.titlebar].join(' ')}>
                    <h1>Your Books</h1>
                    <UserAccountMenu username={this.state.username}/>
                </div>
                <div className={["pure-u-1-8", styles.sidebar].join(' ')}>
                </div>
                <div className="pure-u-3-4">
                    {this.props.children}
                </div>
                <div className={["pure-u-1-8", styles.sidebar].join(' ')}>
                </div>
            </div>
        )
    }
});

