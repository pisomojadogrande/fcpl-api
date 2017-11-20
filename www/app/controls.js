import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'

import styles from './styles.css'

export const ErrorBar = React.createClass({
    propTypes: {
        lastError: PropTypes.string
    },
    render: function() {
        if (this.props.lastError) {
            return(
                <div className={styles.errorBar}>
                    <h3>{this.props.lastError}</h3>
                </div>
            );
        } else {
            return(<div/>);
        }
    }
});

export const LastUpdated = React.createClass({
    propTypes: {
        lastModifiedDate: PropTypes.instanceOf(Date),
        onRefreshClicked: PropTypes.func
    },
    render: function() {
        if (this.props.lastModifiedDate) {
            const lastUpdated = 'Last updated: ' + this.props.lastModifiedDate.toLocaleString();
            return (
                <div style={{position: 'relative', height: '36px'}}>
                    <a style={{position: 'absolute', bottom: '0px'}}>{lastUpdated}</a>
                    <button style={{position: 'absolute', right: '0px', bottom: '0px'}}
                            className={[styles.button, "pure-button"].join(' ')}
                            onClick={this.props.onRefreshClicked}>
                        <i className={["fa", "fa-refresh", styles.inlineIcon].join(' ')}></i>
                        refresh
                    </button>
                </div>
            );
        } else {
            return (<div></div>);
        }
    }
});

export const Spinner = React.createClass({
    render: function() {
        return(
            <div>
                <i className="fa fa-refresh fa-spin fa-fw fa-2x" style={{float: 'right'}}></i>
            </div>
        );
    }
});

export const StatusHeader = React.createClass({
    propTypes: {
        isLoading: PropTypes.bool.isRequired,
        lastError: PropTypes.string,
        lastModifiedDate: PropTypes.instanceOf(Date),
        onRefreshClicked: PropTypes.func
    },
    render: function() {
        if (this.props.lastError) {
            return(<ErrorBar lastError={this.props.lastError}/>);
        } else if (this.props.isLoading) {
            return(<Spinner/>);
        } else {
            return(<LastUpdated lastModifiedDate={this.props.lastModifiedDate}
                                onRefreshClicked={this.props.onRefreshClicked}/>);
        }
    }
});



export const SpinnerSubmitButton = React.createClass({
    propTypes: {
        submitButtonText: PropTypes.string,
        loading: PropTypes.bool,
        disabled: PropTypes.bool,
        onClick: PropTypes.func.isRequired
    },
    getDefaultProps: function() {
        return {
            submitButtonText: 'Submit',
            loading: false,
            disabled: false
        };
    },
    render: function() {
        const submitButtonDisabled = this.props.loading || this.props.disabled;
        const showSpinner = this.props.loading;
        var spinner = '';
        if (showSpinner) {
            spinner = (
                <i className="fa fa-refresh fa-spin fa-fw"></i>  
            );
        }
        return(
            <div>
                <button type="submit"
                        disabled={submitButtonDisabled}
                        className={["pure-button", styles.button].join(' ')}
                        style={{marginTop: "10px"}}
                        onClick={this.props.onClick}>
                    {this.props.submitButtonText}
                </button>
                {spinner}
            </div>
        )
    }
});