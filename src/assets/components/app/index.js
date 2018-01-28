
// @flow

import React from "react";

// eslint-disable-next-line no-unused-vars
import Fontawesome from "font-awesome/scss/font-awesome.scss";

// eslint-disable-next-line no-unused-vars
import AppStyle from "./style/app.scss";


import type {
  ReactNode,
  AppCoreProps,
  AppCoreState
} from "./types";
import AppMain from "./main";
import AppErrorBoundary from "./error_boundary";


class AppCore extends React.Component<AppCoreProps, AppCoreState> {

  /**
   * Render
   */
  render(): ReactNode {
    return (
      <div className="container" data-component="app">
        {this.renderHeader()}
        <AppErrorBoundary>
          <AppMain />
        </AppErrorBoundary>
      </div>
    );
  }

  /**
   * Render header section
   *
   * @return {ReactNode}
   */
  renderHeader (): ReactNode {
    return (
      <header className="pt-5 pb-5 text-center">
        <h1 className="text-uppercase mb-0">Yelp Business Search</h1>
        <h2 className="text-uppercase">
          By{" "}
          <a href="mailto:brendon@aphex.io">Brendon Crawford</a>
        </h2>
      </header>
    );
  }

}


export default AppCore;

