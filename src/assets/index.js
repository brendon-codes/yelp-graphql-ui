
// @flow

import React from "react";
import ReactDom from "react-dom";

import Fontawesome from "font-awesome/scss/font-awesome.scss";
import BootstrapLoader from "./style/bootstrap/load-all.scss"

import App from "./components/app";


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
