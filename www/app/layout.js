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
        var menuList = '';
        if (this.state.showMenu) {
            const linkClass = ["pure-menu-link", styles.accountMenuLink].join(' ');
            const options = [
                { friendly: 'Your account', dest: './account.html' },
                { friendly: 'Activity log', dest: '#' },
                { friendly: 'Sign out', dest: './signin.html' }
            ];
            const menuItems = options.map((opt) => {
                return(
                    <li className="pure-menu-item">
                        <a href={opt.dest} className={['pure-menu-link', styles.accountMenuLink].join(' ')}>
                            {opt.friendly}
                        </a>
                    </li>
                );
            });
            menuList = (
                <ul className={["pure-menu-list", styles.accountMenuList].join(' ')}>
                    {menuItems}
                </ul>
            );
        }
        if (this.props.username) {
            return(
                <div className={styles.accountMenu}>
                    <button className={["pure-button", styles.accountMenuButton].join(' ')}
                            onClick={this.onMenuHeaderClicked}>
                        <i className={["fa", "fa-caret-square-o-down", styles.inlineIcon].join(' ')}></i>
                        {this.props.username}
                    </button>
                    <div className="pure-menu">
                        {menuList}
                    </div>
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
            <div>
                <div className="pure-g">
                    <div className={["pure-u-1", styles.titlebar].join(' ')}>
                        <h1>Your Books</h1>
                        <UserAccountMenu username={this.state.username}/>
                    </div>
                </div>
                <div className="pure-g">
                    <div className={["pure-u-1-8", styles.sidebar].join(' ')}>
                    </div>
                    <div className="pure-u-3-4">
                        {this.props.children}
                    </div>
                    <div className={["pure-u-1-8", styles.sidebar].join(' ')}>
                    </div>
                </div>
            </div>
        )
    }
});

