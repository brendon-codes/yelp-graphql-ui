
// @flow

import React from "react";
import type {
  Node as TypeReactNode
} from "react";
import TrieSearch from "trie-search";

export type ReactNode = TypeReactNode;

//
// This is supposed to exist in Flow,
// but for some reason it cant be found. For now we will
// need to create a placeholder type, until this
// issue is fixed in React/Flow
//
export type ReactEvent = Object;

export type AppQueryObj = {
  query: string,
  variables: Object
}

export type AppCatOrig = {
  alias: string,
  title: string
};

export type AppCatsOrig = Array<AppCatOrig>;

export type AppCat = {
  alias: string,
  clean: string,
  title: string
};

export type AppCats = Array<AppCat>;

export type AppFav = {
  business_id: string
}

export type AppFavs = Array<AppFav>;

export type AppBizRec = {
  id: string,
  name: string,
  url: string,
  distance: ?number,
  photos: Array<string>,
  location: {
    city: string,
    zip_code: string
  },
  categories: {
    title: string,
    alias: string
  }
};

export type AppBizRecs = Array<AppBizRec>;

export type AppProps = {};

export type AppState = {
  //
  // Loading status of business results.
  // This can apply to both favorites and search.
  // Possible values:
  //
  // - "ready"
  // - "loading"
  //
  resultsStatus?: string,
  //
  // Type of business fetch to be done.
  // Possible values:
  //
  // - "search"
  // - "favorite"
  // - null
  //
  fetchMode?: ?string,
  //
  // This is the field which is being sorted on.
  // Possible values:
  //
  // - "distance"
  // - "name"
  // - "location"
  // - "favorite"
  //
  sortField?: string,
  //
  // This is the sort direction of the sorted field.
  // Possible values:
  //
  // - "asc"
  // - "desc"
  //
  sortDir?: string,
  //
  // This tracks the offset which is used for pagination
  //
  offset?: number,
  //
  // This is a Set which tracks the favorites stored in
  // local IndexedDB.
  // Possible values:
  //
  // - null
  // - Set([...])
  //
  favorites?: ?Set<string>,
  //
  // This is a Trie structure which uses the TrieSearch
  // library for tracking categories. This allows for a
  // very quick way to retrieve autosuggest results.
  // Possible values:
  //
  // - null
  // - TrieSearch([...])
  //
  catTrie?: ?TrieSearch,
  //
  // These are the list of suggested categories which
  // are used by the AutoSuggest component.
  // Possible values:
  //
  // - AppCats
  //
  suggestedCats?: AppCats,
  //
  // This is the default selected category code, which follows
  // Yelp's category code definitions.
  // Possible values are any string which matches a valid
  // Yelp category code.
  //
  selectedCat?: ?AppCat,
  //
  // This is the default typed category string which will
  // be rendered inside the Autosuggest box.  This needs
  // to corredpond with the `selectedCat` code.
  //
  typedCatVal?: ?string,
  //
  // This is the zip code substring which is typed into the zip code
  // input box.
  // Possible values:
  //
  // - null
  // - (Any valid zip code substring match)
  //
  zip?: ?string,
  //
  // This is the final zip code string which is typed into the zip code
  // input box.
  // Possible values:
  //
  // - null
  // - (Any valid zip code)
  //
  zipFinal?: ?string,
  //
  // This is the distance in miles which was selected in the
  // distance dropdown.
  // Possible values:
  //
  // - Number(1 - DISTANCE_MILES_MAX)
  //
  distanceMiles?: number,
  //
  // This is the distance in meters which corresponds to the
  // miles value which was selected in the
  // distance dropdown.
  // Possible values:
  //
  // - Number(1 - DISTANCE_METERS_MAX)
  //
  distanceMeters?: number,
  //
  // This is the Array of business objects returned by the
  // Yelp API.
  // Possible values:
  //
  // - null
  // - Array<Object>
  //
  businessRecs?: ?Array<Object>,
  //
  // This is total number of businesses found by Yelp
  // for a given search or query.
  // Possible values:
  //
  // - null
  // - Number
  //
  businessCountTotal?: ?number
};

export type AppErrorProps = {
  children: TypeReactNode
};

export type AppErrorState = {
  hasError: boolean,
  error: ?Error,
  info: ?Object
};

export type AppCoreProps = {};

export type AppCoreState = {};
