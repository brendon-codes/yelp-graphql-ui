
// @flow

/**
 * Various helper services are contained here.
 * This includes network transports, local storage wrappers, etc.
 */

import { Lokka } from "lokka";
import { Transport as LokkaTransport } from "lokka-transport-http";
import Dexie from "dexie";


export const GQL_CLIENT: Lokka = (
  new Lokka({
    transport: new LokkaTransport("/graphql", {
      //
      // We do not set the Authorization header here
      // which contains the Yelp token.
      // Instead, we proxy through our own server,
      // which sets the Authorization header.
      // This way, we do not leak keys to clients.
      //
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "en_US"
      }
    })
  })
);

export const DB: Dexie = new Dexie("dsyelp");
DB.version(1).stores({
  favorites: "&business_id"
});
DB.open();
