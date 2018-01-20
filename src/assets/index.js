
// @flow

import React from "react";
import ReactDom from "react-dom";
import App from "./app";


function setup (): boolean {
  document.addEventListener("DOMContentLoaded", init);
  return true;
}


function init (): boolean {
  ReactDom.render(<App />, document.getElementById("root"));
  return true;
}


setup();


export default true;
