import React from 'react'
import { connect } from 'react-redux'
import { Switch, Route, Redirect, withRouter  } from 'react-router-dom'
import PropTypes from 'prop-types'
import styled from 'styled-components'
// import * as actions from '../actions'
import PopUp from './PopUp'
import BoxScores from './BoxScores'

import 'react-sticky-table/dist/react-sticky-table.css';


const AppBase = styled.div``;

class App extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        const { location, user } = this.props

        return (
            <AppBase>
                <Switch>
                    <Route exact path="/popup2.html" component={ PopUp } />
                    <Route exact path="/index.html" component={ BoxScores } />
                    <Route exact path="/changelog2.html" component={ PopUp } />
                    <Route exact path="/options2.html" component={ PopUp } />
                    <Route exact path="/playoff2.html" component={ PopUp } />
                    <Route exact path="/standings2.html" component={ PopUp } />
                    <Redirect path="*" to="/index.html" />
                </Switch>
            </AppBase>
        )
    }
}

App.propTypes = {

}

const mapStateToProps = () => ({
})

export default withRouter(connect(mapStateToProps, null)(App))
