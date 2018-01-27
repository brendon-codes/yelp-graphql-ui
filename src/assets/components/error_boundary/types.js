// @flow

import React from "react";
import type {
  Node as TypeReactNode
} from "react";

export type ReactNode = TypeReactNode;

export type ErrorProps = {
  children: TypeReactNode
};

export type ErrorState = {
  hasError: boolean,
  error: ?Error,
  info: ?Object
};
