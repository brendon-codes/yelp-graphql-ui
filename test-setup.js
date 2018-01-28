
/**
 * This file contains various hacks and patches needed
 * to get Enzyme properly working with our React app.
 */

import React from "react";
import Adapter from 'enzyme-adapter-react-16';
import { ShallowWrapper, configure } from "enzyme";

import FakeIndexedDb from "fake-indexeddb";
import FakeIndexedDbKeyRange from "fake-indexeddb/lib/FDBKeyRange";
import Fetch from "node-fetch";

const BASE_URL = "http://localhost";

//
// Get better information about unhandled promises rejections
// since the default node behaviour is to not give a stack
// trace for this.
//
process.on(
  "unhandledRejection",
  (r) => {
    console.log("Unhandled Promise Rejection");
    console.log(r);
    return true;
  }
);

//
// Provide a helper method, since only causing .update()
// does not always properly update the dom.
//
ShallowWrapper.prototype.updateDom = async function () {
  await this.instance().forceUpdate();
  await this.update();
  return true;
};

//
// For our tests, we want to disable all automatic
// component updating, and we only want to do it manually.
//
React.Component.prototype.shouldComponentUpdate = function () {
  return false;
};

//
// For our tests, we can override setState with something
// less magical. This allows us to disable any async
// behavious in setState and disable any automatic component
// updating.  This is not absolutely necessary, but it helps
// with debugging tests.
//
React.Component.prototype.setState = function (state, callback) {
  this.state = Object.assign({}, this.state, state);
  if (callback) {
    callback();
  }
  return true;
};

//
// Add Adapter
//
configure({ adapter: new Adapter() });

//
// Add fake IndexedDB interface
//
global.indexedDB = FakeIndexedDb;
global.IDBKeyRange = FakeIndexedDbKeyRange;

//
// Node fetch doesnt take relative urls, so we
// need to prepend them with absolute url base.
//
global.fetch = (url, options) => {
  const newUrl = (
    (url.length > 0 && url[0] === "/") ?
      [BASE_URL, url].join("") :
      url
  );
  return Fetch(newUrl, options);
};

