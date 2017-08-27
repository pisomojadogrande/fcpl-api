import React from 'react'
import ReactDOM from 'react-dom'

var Main = React.createClass({
    getInitialState: function() {
        return {
        };
    },
    render: function() {
        const endpoint = FCPL_API_ENDPOINT;
        return (
            <div>
                <h1>Hello {endpoint}</h1>
            </div>
        );
    }
});

ReactDOM.render(<Main />, document.getElementById('app'));