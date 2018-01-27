
// @flow

import React from "react";
import type {
  ReactNode,
  ErrorProps,
  ErrorState
} from "./types";


class ErrorBoundary extends React.Component<ErrorProps, ErrorState> {

  /**
   * Constructor
   *
   * @param {ErrorProps} props
   * @param {Object} context
   */
  constructor (props: ErrorProps, context: Object): void {
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
  buildDefaultState (): ErrorState {
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
   * Render
   */
  render(): ReactNode {
    if (this.state.hasError) {
      return (<h3>An error has occurred.</h3>);
    }
    return this.props.children;
  }

}


export default ErrorBoundary;

