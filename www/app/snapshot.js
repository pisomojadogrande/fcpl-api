import React from 'react'
import ReactDOM from 'react-dom'
import { Layout } from './layout'
import { BooksTable } from './booksTable'
import styles from './styles.css'

const endpoint = FCPL_API_ENDPOINT;

const url = new URL(window.location.href);
var timestamp = new Date();
const epoch = (url.searchParams && url.searchParams.get('timestamp'));
if (epoch) {
    timestamp = new Date(epoch * 1000);
    if (timestamp == 'Invalid Date') {
        timestamp = new Date();
    }
}


ReactDOM.render(
    <Layout>
        <div className={styles.snapshotHeader}>
            Snapshot from {timestamp.toLocaleString()}
        </div>
        <div className="pure-u-1-6"></div>
        <div className="pure-u-2-3">
            <BooksTable endpoint={endpoint} timestamp={timestamp}/>
        </div>
        <div className="pure-u-1-6"></div>
    </Layout>,
    document.getElementById('app')
);

