import React from 'react'
import ReactDOM from 'react-dom'

import styles from './styles.css'


export const Layout = React.createClass({
    getInitialState: function() {
        return {
        };
    },
    render: function() {
        return (
            <div className="pure-g">
                <div className={["pure-u-1", styles.titlebar].join(' ')}>
                    <h1>Your Books</h1>
                    <div className={styles.accountMenu}>
                        <i className={["fa", "fa-caret-square-o-down", styles.inlineIcon].join(' ')}></i>
                        your_name_here
                    </div>
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

