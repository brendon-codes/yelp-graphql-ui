
// @flow

import React from "react";
import {graphql, QueryRenderer} from 'react-relay';

import Environment from "./environment";

class App extends React.Component {

  constructor(props: Object, context: Object) {
    super(props, context);
    this.setDefaultState();
  }

  buildDefaultState (): Object {
    return {
      categories: null
    }
  }

  setDefaultState (): boolean {
    this.state = this.buildDefaultState();
    return true;
  }

  queryBusinesses (): Object {
    return (
      graphql`
        query appQuery (
          $zip_code: String!,
          $distance: Float!
        ) {
          search(
            location: $zip_code,
            radius: $distance
          ) {
            total
            business {
              name
              url
              distance
              location {
                zip_code
              }
              categories {
                title
                alias
              }
            }
          }
        }
      `
    );
  }

  renderCategories (): Object {
    
  }

  componentWillMount (): boolean {
    this.loadCategories();
    return true;
  }

  loadCategories (): boolean {
    fetch("/categories", {
      method: "GET"
    }).then(response => {
      this.setState({
        categories: response.json()
      });
      return true;
    });
    return true;
  }

  renderBusinesses (): Object {
    return (
      <QueryRenderer
        environment={Environment}
        query={this.queryBusinesses()}
        variables={{
          zip_code: "90402",
          distance: 200.0
        }}
        render={({error, props}) => {
          if (error) {
            return <div>Error!</div>;
          }
          if (!props) {
            return <div>Loading...</div>;
          }
          console.log(props);
          return <div>Business Name</div>;
        }}
      />
    );
  }

  render (): Object {
    return (
      <div>
        {this.renderCategories()}
      </div>
    );
  }

  renderFoo (): Object {
    return (
      <QueryRenderer
        environment={Environment}
        query={this.queryBusinessById()}
        variables={{
          zip_code: "90402",
          distance: 200.0
        }}
        render={({error, props}) => {
          if (error) {
            return <div>Error!</div>;
          }
          if (!props) {
            return <div>Loading...</div>;
          }
          console.log(props);
          return <div>Business Name</div>;
        }}
      />
    );
  }
}

export default App;

