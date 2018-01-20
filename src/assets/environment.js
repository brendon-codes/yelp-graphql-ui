
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
  return fetch("/v3/graphql", {
    method: "POST",
    headers: {
      "Authorization": ["Bearer", config.YELP_TOKEN].join(" "),
      "Content-Type": "application/graphql",
      "Accept-Language": "en_US"
    },
    body: operation.text
  }).then(response => {
    return response.json();
  });
}

const environment = new Environment({
  network: Network.create(fetchQuery),
  store: new Store(new RecordSource()),
});

export default environment;
