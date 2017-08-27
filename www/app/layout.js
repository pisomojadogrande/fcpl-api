import React from 'react'
import ReactDOM from 'react-dom'

export const LayoutStyles = {
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
}; 

export const Layout = React.createClass({
    getInitialState: function() {
        return {
        };
    },
    render: function() {
        return (
            <div className="pure-g">
                <div className="pure-u-1" style={LayoutStyles.titlebarStyle}>
                    <h1>Your Books</h1>
                </div>
                <div className="pure-u-1-8" style={LayoutStyles.sidebarStyle}>
                </div>
                <div className="pure-u-3-4">
                    {this.props.children}
                </div>
                <div className="pure-u-1-8" style={LayoutStyles.sidebarStyle}>
                </div>
            </div>
        )
    }
});

