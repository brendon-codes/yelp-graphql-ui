
// @flow

import React from "react";
import ReactDom from "react-dom";

import App from "./components/app";


function setup (): boolean {
  document.addEventListener("DOMContentLoaded", init);
  return true;
}


function init (): boolean {
  const root: ?Element = document.getElementById("root");
  if (root == null) {
    throw new Error("Could not get root");
  }
  ReactDom.render(<App />, root);
  return true;
}


setup();


export default true;
