import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'

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
                        className="pure-button pure-button-primary"
                        style={{marginTop: "10px"}}
                        onClick={this.props.onClick}>
                    {this.props.submitButtonText}
                </button>
                {spinner}
            </div>
        )
    }
});