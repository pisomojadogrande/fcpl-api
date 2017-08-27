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
    centerModalStyle: {
        backgroundColor: 'navy',
        height: '600px'
    },
    centerFormStyle: {
        backgroundColor: 'white',
        position: 'absolute',
        width: '300px',
        height: 'auto',
        left: '50%',
        marginLeft: '-150px',
        marginTop: '50px',
        padding: '10px'
    }
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

