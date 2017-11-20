import React from 'react'
import ReactDOM from 'react-dom'
import { Layout } from './layout'
import { ErrorBar } from './controls'
import SignedInUser from './signedInUser'

import styles from './styles.css'

class ActivityLog extends React.Component {
    
    signedInUser = new SignedInUser();

    state = {
        loading: true
    };

    componentDidMount() {
        const that = this;
        this.signedInUser.authenticateOrRedirect(function(err, data) {
            if (err) {
                console.error(err);
            } else {
                console.log(`Signed in as ${data.cognitoUser.username}`);
            }
        });
    }
    
    render() {
        return(
            <div><h1>Nothing yet</h1></div>
        );
    }
}

const endpoint = FCPL_API_ENDPOINT;

ReactDOM.render(
    <Layout>
        <ActivityLog endpoint={endpoint}/>
    </Layout>,
    document.getElementById('app')
);

