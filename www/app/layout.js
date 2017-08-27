import React from 'react'
import ReactDOM from 'react-dom'

import { Styles } from './styles'

export const Layout = React.createClass({
    getInitialState: function() {
        return {
        };
    },
    render: function() {
        return (
            <div className="pure-g">
                <div className="pure-u-1" style={Styles.titlebarStyle}>
                    <h1>Your Books</h1>
                </div>
                <div className="pure-u-1-8" style={Styles.sidebarStyle}>
                </div>
                <div className="pure-u-3-4">
                    {this.props.children}
                </div>
                <div className="pure-u-1-8" style={Styles.sidebarStyle}>
                </div>
            </div>
        )
    }
});

