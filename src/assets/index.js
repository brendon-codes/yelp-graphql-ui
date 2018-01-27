
// @flow

import React from "react";
import type { Element as ReactElement } from "react";
import ReactDom from "react-dom";

import ErrorBoundary from "./components/error_boundary";
import App from "./components/app";


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
 * Builds component to be rendered into DOM
 *
 * @return {ReactElement<*>}
 */
function buildComponent (): ReactElement<*> {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
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
  ReactDom.render(buildComponent(), root);
  return true;
}


setup();


export default true;
