
// @flow

import React from "react";
import ReactDom from "react-dom";

import AppCore from "./components/app";


/**
 * Initial entry point function
 *
 * @return {boolean}
 */
function setup (): boolean {
  document.addEventListener("DOMContentLoaded", init);
  return true;
}


/**
 * Callback when DOM is ready
 *
 * @return {boolean}
 */
function init (): boolean {
  const root: ?Element = document.getElementById("root");
  if (root === undefined || root === null) {
    throw new Error("Could not get root");
  }
  ReactDom.render(<AppCore />, root);
  return true;
}


setup();


export default true;
