
// @flow

import {
  Environment,
  Network,
  RecordSource,
  Store,
} from "relay-runtime";

import config from "./config";


function fetchQuery(
  operation,
  variables,
) {
  return fetch("/graphql", {
    method: "POST",
    headers: {
      "Authorization": ["Bearer", config.YELP_TOKEN].join(" "),
      "Content-Type": "application/json",
      "Accept-Language": "en_US"
    },
    body: JSON.stringify({
      query: operation.text,
      variables: variables
    })
  }).then(response => {
    return response.json();
  });
}

const environment = new Environment({
  network: Network.create(fetchQuery),
  store: new Store(new RecordSource()),
});

export default environment;
