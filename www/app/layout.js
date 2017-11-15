import React from 'react'
import ReactDOM from 'react-dom'

export const LayoutStyles = {
    titlebarStyle: {
        backgroundColor: 'lawngreen',
        color: 'midnightblue',
        width: '100%',
        textAlign: 'center',
        position: 'relative'
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
    },
    warningTextStyle: {
        color: 'red'
    },
    errorBarStyle: {
        backgroundColor: '#c90014',
        color: 'white',
        width: '100%',
        paddingLeft: '5px',
        marginTop: '10px'
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
                    <div style={{position: 'absolute',
                                 right: '0px',
                                 top: '0px',
                                 margin: '10px',
                                 padding: '5px',
                                 backgroundColor: 'yellow'}}>
                        <div className="pure-menu">
                            <span className="pure-menu-heading">your_name</span>
                            <ul className="pure-menu-list">
                                <li className="pure-menu-item"><a href="#" className="pure-menu-link">Foo</a></li>
                                <li className="pure-menu-item"><a href="#" className="pure-menu-link">Bar</a></li>
                            </ul>
                        </div>
                    </div>
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

