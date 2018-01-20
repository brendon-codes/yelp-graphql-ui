
// @flow

import React from "react";
import {graphql, QueryRenderer} from 'react-relay';

import Environment from "./environment";

class App extends React.Component {
  render() {
    return (
      <QueryRenderer
        environment={Environment}
        query={graphql`
          query appQuery {
            business(id: "garaje-san-francisco") {
              name
            }
          }
        `}
        variables={{}}
        render={({error, props}) => {
          if (error) {
            return <div>Error!</div>;
          }
          if (!props) {
            return <div>Loading...</div>;
          }
          return <div>Business Name: {props.business.name}</div>;
        }}
      />
    );
  }
}

export default App;

