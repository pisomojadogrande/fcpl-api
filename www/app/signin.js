import React from 'react'
import ReactDOM from 'react-dom'
import { Layout } from './layout'
import { Styles } from './styles'

var SignIn = React.createClass({
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

ReactDOM.render(
    <Layout>
        <SignIn />
    </Layout>,
    document.getElementById('app')
);