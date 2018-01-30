
// @flow

/**
 * This operates as a React error boundary component
 * for catching errors in sub components. This is a new
 * feature in React 16.
 */

import React from "react";
import type {
  ReactNode,
  AppErrorProps,
  AppErrorState
} from "./types";


class AppErrorBoundary extends React.Component<AppErrorProps, AppErrorState> {

  /**
   * Constructor
   *
   * @param {ErrorProps} props
   * @param {Object} context
   */
  constructor (props: AppErrorProps, context: Object): void {
    super(props, context);
    this.state = this.buildDefaultState();
    return;
  }

  /**
   * Returns a default state
   *
   * For more information on possible values and types
   * for each state property, see `types.AppState`.
   *
   * @retun {AppState}
   */
  buildDefaultState (): AppErrorState {
    return {
      hasError: false,
      error: null,
      info: null
    };
  }

  /**
   * Callback for catching errors in children components
   *
   * @param {any} error
   * @param {any} info
   * @return {boolean}
   */
  componentDidCatch (error: Error, info: Object): boolean {
    this.setState({
      hasError: true,
      error: error,
      info: info
    });
    // eslint-disable-next-line no-console
    console.error(error.message);
    // $FlowFixMe
    console.error(error.origError); // eslint-disable-line no-console
    // eslint-disable-next-line no-console
    console.error(info);
    return true;
  }

  /**
   * Render Error
   */
  renderError (): ReactNode {
    return (
      <main>
        <div className="container">
          <div className="row mt-5">
            <div className="col font-weight-bold text-center">
              An error occurred.
              Please contact{" "}
              <a href="mailto:brendon@aphex.io">Brendon Crawford</a>{" "}
              for support.
            </div>
          </div>
        </div>
      </main>
    );
  }

  /**
   * Render
   */
  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderError();
    }
    return this.props.children;
  }

}


export default AppErrorBoundary;

