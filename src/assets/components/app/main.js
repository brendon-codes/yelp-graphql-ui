
// @flow

/**
 * Yelp Business Search Component
 *
 * This acts as a basic Yelp Business Search client,
 * making use of the Yelp GraphQL API.
 *
 * There are two Yelp bugs to be mindful of.  Please see the README.md
 * file for more information on those.
 *
 */

import React from "react";

import Autosuggest from "react-autosuggest";
import TrieSearch from "trie-search";

import type {
  ReactNode,
  ReactEvent,
  AppQueryObj,
  AppCatOrig,
  AppCatsOrig,
  AppCat,
  AppCats,
  AppFav,
  AppFavs,
  AppBizRec,
  AppBizRecs,
  AppProps,
  AppState
} from "./types";

import {
  BIZ_SEARCH_LIMIT,
  BIZ_DISPLAY_LIMIT,
  CAT_SEARCH_LIMIT,
  CAT_CLEAN_RE,
  DISTANCE_MILES_MAX,
  DISTANCE_METERS_MAX,
  DISTANCE_METERS_PER_MILE,
  DISTANCE_DEFAULT,
  ZIP_DEFAULT,
  INITIAL_FETCH_MODE
} from "./constants.js";

import {
  GQL_CLIENT,
  DB
} from "./services";


class AppMain extends React.Component<AppProps, AppState> {

  /**
   * Constructor
   *
   * @param {AppProps} props - Props
   * @param {Object} context - Context
   * @return {void}
   */
  constructor(props: AppProps, context: Object): void {
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
  buildDefaultState (): AppState {
    return {
      resultsStatus: "ready",
      fetchMode: null,
      sortField: "distance",
      sortDir: "asc",
      offset: 0,
      favorites: null,
      catTrie: null,
      suggestedCats: [],
      selectedCat: {
        alias: "restaurants",
        title: "Restaurants",
        clean: "restaurants"
      },
      typedCatVal: "Restaurants",
      zip: ZIP_DEFAULT,
      zipFinal: ZIP_DEFAULT,
      distanceMiles: DISTANCE_DEFAULT,
      distanceMeters: this.convertMilesToMeters(DISTANCE_DEFAULT),
      businessRecs: null,
      businessCountTotal: null
    };
  }

  /**
   * Performs a category search
   *
   * @param {string} value - Category string to search for
   * @return {AppCats} - Found categories
   */
  searchCategories (value: string): AppCats {
    const cleanVal: string = this.cleanCatTitle(value);
    if (this.state.catTrie === undefined || this.state.catTrie === null) {
      this.setAppFatal("catTrie must be set");
      return [];
    }
    const res = this.state.catTrie.get(cleanVal).slice(0, CAT_SEARCH_LIMIT);
    return res;
  }

  /**
   * Event handler for setting suggested categories
   *
   * @param {{value: string}} - Category string to search for
   * @return {boolean}
   */
  handleSuggCatsFetchRequested ({value}: {value: string}): boolean {
    this.setStatePromise({
      suggestedCats: this.searchCategories(value)
    });
    return true;
  }

  /**
   * Event handler for when Autosuggest category search
   * is cleared.
   *
   * @return {boolean}
   */
  handleSuggCatsClearRequested (): boolean {
    this.setStatePromise({
      suggestedCats: []
    });
    return true;
  }

  /**
   * Autosuggest callback to get the internal value
   * of a category object
   *
   * @param {AppCat} cat - Category object
   * @return {string} - Category value
   */
  getSuggestionValue (cat: AppCat): string {
    return cat.alias;
  }

  /**
   * Autosuggest callback to get the display element
   * of a category object
   *
   * @param {AppCat} cat - Category object
   * @return {ReactNode} - Element to render
   */
  renderSuggCat (cat: AppCat): ReactNode {
    return (
      <div>
        {cat.title}
      </div>
    );
  }

  /**
   * Wrapper to clean and retrieve a single category
   * value if it exists
   *
   * @param {string} value - Category value to search for
   * @return {?AppCat} - Found catetgory, if any
   */
  findSingleCat (value: string): ?AppCat {
    const cleanVal: string = this.cleanCatTitle(value);
    if (this.state.catTrie === undefined || this.state.catTrie === null) {
      this.setAppFatal("catTrie must be set");
      return null;
    }
    const res: AppCats = this.state.catTrie.get(cleanVal);
    if (res.length !== 1) {
      return null;
    }
    if (res[0].clean !== cleanVal) {
      return null;
    }
    return res[0];
  }

  /**
   * Event handler for suggested category change
   *
   * @param {ReactEvent} event - Event from Autosuggest
   * @param {{newValue: string}} - New category value
   * @return {boolean}
   */
  handleSuggCatChange (
    event: ReactEvent,
    {newValue}: {newValue: string}
  ): Promise<boolean> {
    return this.updateSuggCat(newValue);
  }

  /**
   * Updates suggested cat
   */
  updateSuggCat (newValue: string): Promise<boolean> {
    const selectedCat: ?AppCat = this.findSingleCat(newValue);
    const catVal: ?string = (
      (newValue === "") ?
        null :
        newValue
    );
    return (
      this.setStatePromise({
        typedCatVal: catVal,
        selectedCat: selectedCat
      })
        .then(() => true)
    );
  }

  /**
   * Autosuggest event handler for selecting a
   * suggested category
   *
   * @param {ReactEvent} event - Event from Autosuggest
   * @param {
   *   suggestion: AppCat
   * } - Suggestion information from Autosuggest
   * @return {boolean}
   */
  handleSuggCatSelected (
    event: ReactEvent,
    {
      suggestion
    }: {
      suggestion: AppCat
    }
  ): boolean {
    this.setStatePromise({
      typedCatVal: suggestion.title,
      selectedCat: suggestion
    });
    return true;
  }

  /**
   * Get a suggested category display value
   *
   * @return {string}
   */
  getSuggCatValue (): string {
    if (
      this.state.typedCatVal === undefined ||
        this.state.typedCatVal === null
    ) {
      return "";
    }
    return this.state.typedCatVal;
  }

  /**
   * Returns the Autosuggest element
   *
   * @return {ReactNode} -
   *   An element containing the Autosuggest element
   */
  renderInputCategories (): ReactNode {
    return (
      <div id="cats-box" className="form-group mr-2">
        <Autosuggest
            suggestions={this.state.suggestedCats}
            onSuggestionsFetchRequested={
              this.handleSuggCatsFetchRequested.bind(this)
            }
            onSuggestionsClearRequested={
              this.handleSuggCatsClearRequested.bind(this)
            }
            onSuggestionSelected={this.handleSuggCatSelected.bind(this)}
            getSuggestionValue={this.getSuggestionValue.bind(this)}
            renderSuggestion={this.renderSuggCat.bind(this)}
            inputProps={{
              className: "form-control",
              placeholder: "Optional Category",
              value: this.getSuggCatValue(),
              onChange: this.handleSuggCatChange.bind(this)
            }}
        />
      </div>
    );
  }

  /**
   * React hook.
   * Calls initial data loader.
   *
   * @return {boolean}
   */
  componentDidMount (): boolean {
    this.loadInitData();
    return true;
  }

  /**
   * This loads the initial categories and favorites
   * data, then calls fetchResults to populate business
   * listings with some initial data.
   *
   * @return {Promise<boolean>}
   */
  loadInitData (): Promise<boolean> {
    return (
      this
        .loadCatsAndFavs()
        .then(this.fetchResults.bind(this, INITIAL_FETCH_MODE, 0))
    );
  }

  /**
   * Loads initial data such as categories from the
   * Yelp REST api, and the favorites from IndexedDB
   *
   * @param {boolean} shouldFetchResults
   * @return {boolean}
   */
  loadCatsAndFavs (): Promise<boolean> {
    const loaders: [Promise<AppCatsOrig>, Promise<AppFavs>] = [
      this.loadCategories(),
      this.loadFavorites()
    ];
    const res: Promise<boolean> = (
      Promise
        .all(loaders)
        .then(resGroups => {
          return {
            categories: resGroups[0],
            favorites: resGroups[1]
          };
        })
        .then(obj => {
          return (
            this.setStatePromise(
              {
                favorites: this.preProcessFavorites(obj.favorites),
                catTrie: this.preProcessCategories(obj.categories)
              }
            )
              .then(() => true)
          );
        })
    );
    return res;
  }

  /**
   * A wrapper for setState which returns
   * a promise. This is mostly helpful for
   * enzyme tests, since there are times
   * when promises from network calls can resolve
   * causing the component to unmount before setState
   * is completed.
   *
   * @param {AppState} state - New state object
   * @return {Promise<any>}
   */
  setStatePromise (state: AppState): Promise<any> {
    return (
      new Promise(
        (resolve) => {
          this.setState(
            state,
            () => {
              resolve(true);
              return true;
            }
          );
          return true;
        }
      )
    );
  }

  /**
   * Pre process favorites
   *
   * @param {Array<AppFav>} - Favorites records
   * @return {Set<string>} - Set of business ids
   */
  preProcessFavorites (favorites: Array<AppFav>): Set<string> {
    const results: Set<string> = new Set(favorites.map(fav => fav.business_id));
    return results;
  }

  /**
   * Load favorites from indexeddb
   *
   * @return {Array<AppFav>} - Favorites records
   */
  loadFavorites (): Promise<AppFavs> {
    return (
      DB
        .favorites
        .toArray(favorites => favorites)
        .catch((error) => {
          this.setAppFatal("Cannot load favorites from DB", error);
          return null;
        })
    );
  }

  /**
   * Load categories from Yelp REST.
   *
   * @return {Promise<AppCatsOrig>} - Promise of categores Array
   */
  loadCategories (): Promise<AppCatsOrig> {
    return (
      fetch(
        "/categories",
        {
          method: "GET"
        }
      )
        .then(response => response.json())
        .catch((error) => {
          this.setAppFatal("Count not fetch cats", error);
          return [];
        })
    );
  }

  /**
   * Clean category title string
   *
   * @param {string} val - Category value to clean
   * @return {string} - Cleaned value
   */
  cleanCatTitle (val: string): string {
    return val.replace(CAT_CLEAN_RE, "").toLowerCase();
  }

  /**
   * Pre process categories
   *
   * @param {AppCats} cats - Catogories Array
   * @return {TrieSearch} -
   *   A TrieSearch object representing a Trie structure
   */
  preProcessCategories (cats: AppCatsOrig) {
    const buildCat: Function = (cat: AppCatOrig): AppCat  => {
      return {
        clean: this.cleanCatTitle(cat.title),
        title: cat.title,
        alias: cat.alias
      };
    };
    const ts: TrieSearch = (
      new TrieSearch(
        "clean",
        {
          min: 1,
          ignoreCase: false,
          splitOnRegEx: undefined
        }
      )
    );
    const builtCats: AppCats = cats.map(buildCat.bind(this));
    ts.addAll(builtCats);
    return ts;
  }

  /**
   * Returns loading element
   *
   * @return {ReactNode} - Element
   */
  renderLoading (): ReactNode {
    return (
      <div className="row pt-5">
        <div className="col text-center">
          <span className="fa fa-refresh fa-spin fa-3x fa-fw"></span>
        </div>
      </div>
    );
  }

  /**
   * Returns element for waiting for a search.
   *
   * @return {ReactNode} - Element
   */
  renderWaitingForAction (): ReactNode {
    return (
      <div className="row pt-5">
        <div className="col font-italic text-center">
          Search for businesses and activities in your area!
        </div>
      </div>
    );
  }

  /**
   * Wrapper to return Element for businesses
   * listings section.
   *
   * @return {ReactNode} - Element
   */
  renderBusinessSection (): ReactNode {
    //
    // A user operation is currently in progress
    //
    if (this.state.resultsStatus === "loading") {
      return this.renderLoading();
    }
    //
    // No business results are currently available
    // and no user operation is currently in progress
    //
    if (
      this.state.businessRecs === undefined ||
        this.state.businessRecs === null
    ) {
      return this.renderWaitingForAction();
    }
    //
    // We have received a response on request for
    // businesses, but no records exist
    //
    if (this.state.businessRecs.length === 0) {
      return this.renderResultsEmpty();
    }
    //
    // We have business records available to show
    //
    return this.renderBusinessesReady();
  }

  /**
   * Returns element for business ready to render results
   *
   * @return {ReactNode} - Element
   */
  renderBusinessesReady (): ReactNode {
    return (
      <div className="mt-3">
        {this.renderPagerBox()}
        {this.renderResultsTable()}
      </div>
    );
  }

  /**
   * Returns element for top pager information.
   *
   * @return {ReactNode} - Element
   */
  renderPagerBox (): ReactNode {
    return (
      <div className="row mb-1 justify-content-between">
        {this.renderPagerText()}
        {this.renderPagerNav()}
      </div>
    );
  }

  /**
   * Returns element for empty business results.
   *
   * @return {ReactNode} - Element
   */
  renderResultsEmpty (): ReactNode {
    const resultLabel: string = this.getFetchModeText();
    return (
      <div className="row pt-5">
        <div id="msg-empty-results" className="col font-italic text-center">
          No {resultLabel} are available.
        </div>
      </div>
    );
  }

  /**
   * Click handler for a top row head for specifying
   * sort field and sort direction.
   *
   * @param {string} code - Sort field
   * @param {ReactEvent} event - React click event
   * @return {boolean}
   */
  handleClickRowHeadField (
    code: string,
    event: ReactEvent
  ): boolean {
    event.preventDefault();
    const opts: Object = {
      sortField: this.state.sortField,
      sortDir: this.state.sortDir
    };
    if (this.state.sortField !== code) {
      opts.sortField = code;
    }
    else {
      opts.sortDir = (() => {
        if (this.state.sortDir === "asc") {
          return "desc";
        }
        if (this.state.sortDir === "desc") {
          return "asc";
        }
        this.setAppFatal("Invalid sort direction.");
        return "";
      })();
    }
    if (
      this.state.businessRecs === undefined ||
        this.state.businessRecs === null
    ) {
      this.setAppFatal("businessRecs must be set");
      return false;
    }
    opts.businessRecs = (
      this.sortBizRecs(
        this.state.businessRecs,
        opts.sortField,
        opts.sortDir
      )
    );
    this.setStatePromise(opts);
    return false;
  }

  /**
   * Returns an element for a field head to be clicked
   * for specifying sort field and direction.
   *
   * @param {string} val - Text to be displayed
   * @param {string} code - Sort field code
   * @return {ReactNode} - Element
   */
  renderRowHeadField (val: string, code: string): ReactNode {
    const iconClassName: string = (() => {
      if (this.state.sortDir === "asc") {
        return "fa-chevron-up";
      }
      if (this.state.sortDir === "desc") {
        return "fa-chevron-down";
      }
      this.setAppFatal("Invalid sort direction.");
      return "";
    })();
    const selected: boolean = (this.state.sortField === code);
    const linkClassName: string = (
      selected ?
        "sorter-select" :
        "sorter-noselect"
    );
    const sortIcon: ReactNode = (
      selected ?
        (
          <span>
            <span
                className={this.buildClassNames(["fa", iconClassName])}></span>
            &nbsp;
          </span>
        ) :
        null
    );
    return (
      <a
          className={linkClassName}
          href="#"
          onClick={this.handleClickRowHeadField.bind(this, code)}>
        {sortIcon}
        <span>
          {val}
        </span>
      </a>
    );
  }

  /**
   * Returnss business results table
   *
   * @return {ReactNode} - Element
   */
  renderResultsTable (): ReactNode {
    if (
      this.state.businessRecs === undefined ||
        this.state.businessRecs === null
    ) {
      this.setAppFatal("businessRecs should not be empty");
      return null;
    }
    const outRecs: Array<ReactNode> = (
      this.state.businessRecs.map(this.renderBusinessRec.bind(this))
    );
    return (
      <table id="res-table">
        <thead>
          <tr className="text-uppercase font-weight-bold">
            <th>&nbsp;</th>
            <th>
              {this.renderRowHeadField("Name", "name")}
            </th>
            <th>
              {this.renderRowHeadField("Location", "location")}
            </th>
            <th className="text-center">
              {this.renderRowHeadField("Miles", "distance")}
            </th>
            <th className="text-center">
              {this.renderRowHeadField("Favorite", "favorite")}
            </th>
          </tr>
        </thead>
        <tbody>
          {outRecs}
        </tbody>
      </table>
    );
  }

  /**
   * Returns element for page nav actions
   *
   * @return {ReactNode} - Element
   */
  renderPagerNav (): ReactNode {
    if (this.state.fetchMode !== "search") {
      return null;
    }
    const [ showPrev: boolean, showNext: boolean ] = this.getPageLinkInfo();
    const optsPrev: Object = (
      showPrev ?
        {
          onClick: this.pageResults.bind(this, -1),
          href: "#"
        } :
        {}
    );
    const optsNext: Object = (
      showNext ?
        {
          onClick: this.pageResults.bind(this, +1),
          href: "#"
        } :
        {}
    );
    return (
      <div className="col text-right text-uppercase font-weight-bold">
        <a id="page-prev" {...optsPrev}>Previous</a>
        &nbsp;&nbsp;<span className="pager-sep">|</span>&nbsp;&nbsp;
        <a id="page-next" {...optsNext}>Next</a>
      </div>
    );
  }

  /**
   * Gets fetch mode text for display
   *
   * @return {string}
   */
  getFetchModeText (): string {
    if (this.state.fetchMode === "search") {
      return "search results";
    }
    if (this.state.fetchMode === "favorite") {
      return "favorites";
    }
    this.setAppFatal("fetchMode must be set");
    return "";
  }

  /**
   * Returns Element displaying pager info
   *
   * @return {ReactNode} - Element
   */
  renderPagerText (): ReactNode {
    const resultLabel: string = this.getFetchModeText();
    if (this.state.offset === undefined || this.state.offset === null) {
      this.setAppFatal("offset must be set");
      return null;
    }
    const start: string = this.state.offset.toString();
    if (
      this.state.businessRecs === undefined ||
        this.state.businessRecs === null
    ) {
      this.setAppFatal("businessRecs must be set");
      return null;
    }
    const end: string = (
      (this.state.offset + this.state.businessRecs.length).toString()
    );
    if (
      this.state.businessCountTotal === undefined ||
        this.state.businessCountTotal === null
    ) {
      this.setAppFatal("businessCountTotal must be set");
      return null;
    }
    //
    // Need to export this as string.  This was causing a bug in Enzyme
    // when forceUpdate and update was called, while this was just a number
    // instead of a string, it was causing the test to hang forever.
    //
    const bizCountTotalStr: string = this.state.businessCountTotal.toString();
    return (
      <div id="pager-info" className="col font-italic">
        Displaying{" "}
        <strong>{start}</strong>{" "}
        &mdash;{" "}
        <strong>{end}</strong>{" "}
        of{" "}
        <strong>{bizCountTotalStr}</strong>{" "}
        {resultLabel}
      </div>
    );
  }

  /**
   * Updates pager information
   *
   * @param {number} pageCount - Page count
   * @param {ReactEvent} event - React event
   * @return {Promise<boolean>}
   */
  pageResults (pageCount: number, event: ReactEvent): Promise<boolean> {
    event.preventDefault();
    const offset: number = this.getPageOffset(pageCount);
    return this.fetchResultsForCurrentMode(offset);
  }

  /**
   * Get page link info
   *
   * @return {Array<boolean>} - Show previous, Show Next
   */
  getPageLinkInfo (): [boolean, boolean] {
    if (this.state.offset === undefined || this.state.offset === null) {
      this.setAppFatal("offset must be set");
      return [false, false];
    }
    const offset: number = this.state.offset;
    const bizTotal: ?number = this.state.businessCountTotal;
    const totalIsNull: boolean = (bizTotal === null);
    const showPrev: boolean = (!totalIsNull && (offset > 0));
    const showNext: boolean = (
      // $FlowFixMe
      (!totalIsNull && ((offset + BIZ_DISPLAY_LIMIT) <= bizTotal))
    );
    //debugger;
    return [showPrev, showNext];
  }

  /**
   * Get page offset
   *
   * @param {numbaer} pageCount - Page count
   * @return {number} - Offset value
   */
  getPageOffset (pageCount: number): number {
    if (this.state.offset === undefined || this.state.offset === null) {
      this.setAppFatal("offset must be set");
      return 0;
    }
    const origOffset: number = this.state.offset;
    const incVal: number = BIZ_DISPLAY_LIMIT * pageCount;
    const checkOffset: number = origOffset + incVal;
    const offset: number = ((): number => {
      if (checkOffset <= 0) {
        return 0;
      }
      if (
        this.state.businessCountTotal === undefined ||
          this.state.businessCountTotal === null
      ) {
        return 0;
      }
      if (checkOffset > this.state.businessCountTotal) {
        return origOffset;
      }
      return checkOffset;
    })();
    return offset;
  }

  /**
   * Build class names string from array
   *
   * @param {Array<string|null>} classNames - Classnames array
   * @return {string} - Built classname string
   */
  buildClassNames (classNames: Array<?string>): string {
    return (
      classNames
        .filter((v) => (v !== null))
        .join(" ")
    );
  }

  /**
   * Checks if business has an associated favorite
   *
   * @param {string} bizId - Business id string from Yelp
   * @return {boolean}
   */
  doesBizHavFav (bizId: string): boolean {
    if (
      this.state.favorites === undefined ||
        this.state.favorites === null
    ) {
      this.setAppFatal("favorites must be set");
      return false;
    }
    const res: boolean = this.state.favorites.has(bizId);
    return res;
  }

  /**
   * Checks if business has a favorite, but
   * does not throw error if favorites have not
   * yet loaded, making it slightly different
   * from doesBizHavFav().
   *
   * @param {string} bizId - Business id string from Yelp
   * @return {boolean}
   */
  isFavorite (bizId: string): boolean {
    return (
      (this.state.favorites !== undefined) &&
      (this.state.favorites !== null) &&
        this.state.favorites.has(bizId)
    );
  }

  /**
   * Removes a favorite
   *
   * @param {string} bizId - Business id string from Yelp
   * @return {Promise<boolean>}
   */
  removeFavorite (bizId: string): Promise<boolean> {
    return (
      DB
        .favorites
        .where("business_id")
        .equals(bizId)
        .limit(1)
        .delete()
        .catch((error) => {
          this.setAppFatal("Coult not delete by business id", error);
          return null;
        })
        .then(this.reloadFavorites.bind(this))
        .then(() => true)
    );
  }

  /**
   * Refetches and syncs favorites
   *
   * @return {Promise<boolean>}
   */
  reloadFavorites (): Promise<boolean> {
    return (
      this
        .loadFavorites()
        .then(favorites => {
          return (
            this.setStatePromise({
              favorites: this.preProcessFavorites(favorites)
            })
              .then(() => true)
          );
        })
    );
  }

  /**
   * Adds a favorite
   *
   * @param {string} bizId - Business id string from Yelp
   * @return {Promise<boolean>}
   */
  addFavorite (bizId: string): Promise<boolean> {
    return (
      DB
        .favorites
        .put({
          "business_id": bizId
        })
        .catch((error) => {
          this.setAppFatal("Could not update DB by biz id", error);
          return null;
        })
        .then(this.reloadFavorites.bind(this))
        .then(() => true)
    );
  }

  /**
   * Handles when a favorite is clicked
   *
   * @param {string} bizId - Business id string from Yelp
   * @param {ReactEvent} event - React event
   * @return {Promise<boolean>}
   */
  handleClickFav (
    bizId: string,
    // eslint-disable-next-line no-unused-vars
    event: ReactEvent
  ): Promise<boolean> {
    const isFav: boolean = this.isFavorite(bizId);
    if (isFav) {
      return this.removeFavorite(bizId);
    }
    return this.addFavorite(bizId);
  }

  /**
   * Returns business record for display element
   *
   * @param {AppBizRec} biz - Business record
   * @return {ReactNode}
   */
  renderBusinessRec (biz: AppBizRec): ReactNode {
    const selected: boolean = this.doesBizHavFav(biz.id);
    const classes: Array<?string> = (
      selected ?
        ["fav-item", "fa", "fa-heart", "heart-select"] :
        ["fav-item", "fa", "fa-heart", "heart-noselect"]
    );
    const photoUrl: ?string = (
      (biz.photos.length > 0) ?
        biz.photos[0] :
        null
    );
    const photo: ReactNode = (
      (photoUrl !== null) ?
        (
          <img className="logo" src={photoUrl} />
        ) :
        null
    );
    const loc: Array<string> = [];
    if (biz.location.hasOwnProperty("city") && (biz.location.city !== null)) {
      loc.push(biz.location.city);
    }
    if (
      biz.location.hasOwnProperty("zip_code") &&
       (biz.location.zip_code !== null)
    ) {
      loc.push(biz.location.zip_code);
    }
    const locStr: string = (
      (loc.length > 0) ?
        loc.join(", ") :
        " "
    );
    const milesStr: string = (
      (
        biz.hasOwnProperty("distance") &&
          (biz.distance !== undefined) &&
          (biz.distance !== null)
      ) ?
        this.convertMetersToMiles(biz.distance).toString() :
        " "
    );
    return (
      <tr key={biz.id}>
        <td>
          {photo}
        </td>
        <td className="rec-biz-name">
          <a href={biz.url}>{biz.name}</a>
        </td>
        <td>{locStr}</td>
        <td className="text-center">{milesStr}</td>
        <td className="text-center">
          <span
              onClick={this.handleClickFav.bind(this, biz.id)}
              className={this.buildClassNames(classes)}>
          </span>
        </td>
      </tr>
    );
  }

  /**
   * Event handler when zip input is changed
   *
   * @param {ReactEvent} event - React event
   * @return {boolean}
   */
  handleChangeZip (event: ReactEvent): boolean {
    const val: ?string = (
      (event.target.value === "") ?
        null :
        event.target.value
    );
    const checkGood: RegExp = new RegExp("^[0-9]{1,5}(-[0-9]{0,4})?$");
    if (val !== undefined && val !== null) {
      if (!val.match(checkGood)) {
        return true;
      }
    }
    const checkFinal: RegExp = new RegExp("^[0-9]{5}(-[0-9]{4})?$");
    // Have to do this to make FlowType happy :(
    const zipFinal: ?string = ((): ?string => {
      if (val === undefined || val === null) {
        return null;
      }
      return (
        !val.match(checkFinal) ?
          null :
          val
      );
    })();
    this.setStatePromise({
      zip: val,
      zipFinal: zipFinal
    });
    return true;
  }

  /**
   * Renders zip input
   *
   * @return {ReactNode}
   */
  renderInputZipcode (): ReactNode {
    const zipVal: ?string = (
      (this.state.zip === null) ?
        "" :
        this.state.zip
    );
    return (
      <div className="form-group mr-2">
        <input
            id="inp-zip"
            className="form-control"
            onChange={this.handleChangeZip.bind(this)}
            placeholder="Zip Code"
            type="text"
            value={zipVal} />
      </div>
    );
  }

  /**
   * Converts meters to miles
   *
   * @param {number} meters - Meters
   * @return {number} - Miles
   */
  convertMetersToMiles (meters: number): number {
    if (meters >= DISTANCE_METERS_MAX) {
      return DISTANCE_MILES_MAX;
    }
    return (
      parseFloat((meters / DISTANCE_METERS_PER_MILE).toFixed(1))
    );
  }

  /**
   * Converts miles to meters
   *
   * @param {number} miles - Miles
   * @return {number} - Meters
   */
  convertMilesToMeters (miles: number): number {
    if (miles >= DISTANCE_MILES_MAX) {
      return DISTANCE_METERS_MAX;
    }
    return (miles * DISTANCE_METERS_PER_MILE);
  }

  /**
   * Event handler when distance is changedo
   *
   * @param {ReactEvent} event - React event
   * @return {boolean}
   */
  handleChangeDistance (event: ReactEvent): boolean {
    const miles: number = parseInt(event.target.value, 10);
    const meters: number = this.convertMilesToMeters(miles);
    this.setStatePromise({
      distanceMiles: miles,
      distanceMeters: meters
    });
    return true;
  }

  /**
   * Render distance input field
   *
   * @return {ReactNode}
   */
  renderInputDistance (): ReactNode {
    if (
      this.state.distanceMiles === undefined ||
        this.state.distanceMiles === null
    ) {
      this.setAppFatal("distanceMiles must be set");
      return null;
    }
    const val: number = this.state.distanceMiles;
    const nums: Array<number> = this.range(1, DISTANCE_MILES_MAX + 1);
    return (
      <div className="form-group mr-2">
        <label className="mr-1" htmlFor="inp_distance">Miles:</label>
        <select
            id="inp_distance"
            className="form-control"
            value={val}
            onChange={this.handleChangeDistance.bind(this)}>
          {nums.map(num =>
            <option value={num} key={num}>{num.toString()}</option>
          )}
        </select>
      </div>
    );
  }

  /**
   * Returns a range of numbers
   *
   * @param {number} start - Start number
   * @param {number} end - End number
   * @return {Array<number>}
   */
  range (start: number, end: number): Array<number> {
    return Array.from({length: (end - start)}, (v, k) => k + start);
  }

  /**
   * Fetches search results, given an offset
   *
   * @param {number} offset - Offset index to start at
   * @return {boolean}
   */
  fetchSearchResults (offset: number): Promise<boolean> {
    const varCat: ?string = (
      (
        this.state.selectedCat === undefined ||
       this.state.selectedCat === null
      ) ?
        null :
        this.state.selectedCat.alias
    );
    if (this.state.zip === undefined || this.state.zip === null) {
      this.setAppFatal("zip must be set");
      return this.buildPromise(false);
    }
    if (
      this.state.distanceMeters === undefined ||
        this.state.distanceMeters === null
    ) {
      this.setAppFatal("distanceMeters must be set");
      return this.buildPromise(false);
    }
    const queryObj: AppQueryObj = (
      this.buildQueryBizSearch(
        BIZ_SEARCH_LIMIT,
        offset,
        this.state.zip,
        this.state.distanceMeters,
        varCat
      )
    );
    return (
      GQL_CLIENT
        .send(queryObj.query, queryObj.variables)
        .catch((error) => {
          this.setAppFatal("Could not send GQL query for search", error);
          return false;
        })
        .then((data) => {
          return (
            this.setStatePromise({
              fetchMode: "search",
              resultsStatus: "ready",
              offset: offset,
              businessCountTotal: data.search.total,
              businessRecs: this.sortBizRecsFromState(data.search.business)
            })
              .then(() => true)
          );
        })
    );
  }

  /**
   * Wrapper to resort business recs
   *
   * @param {AppBizRecs} bizRecs - Business records
   * @return {AppBizRecs} - Sorted recs
   */
  sortBizRecsFromState (bizRecs: AppBizRecs): AppBizRecs {
    if (this.state.sortField === undefined || this.state.sortField === null) {
      this.setAppFatal("sortField must be set");
      return [];
    }
    if (this.state.sortDir === undefined || this.state.sortDir === null) {
      this.setAppFatal("sortDir must be set");
      return [];
    }
    return this.sortBizRecs(bizRecs, this.state.sortField, this.state.sortDir);
  }

  /**
   * Sorts business recs
   *
   * @param {AppBizRecs} bizRecs - Business records
   * @param {string} sortField - Field code string to sort on
   * @param {sortDir} sortDir - Sort direction code
   * @return {AppBizRecs} - Sorted recs
   */
  sortBizRecs (
    bizRecs: AppBizRecs,
    sortField: string,
    sortDir: string
  ): AppBizRecs {
    const checkDir: Function = (condition): number => {
      const [dirYes: number, dirNo: number] = ((): [number, number] => {
        if (sortDir === "asc") {
          return [-1, +1];
        }
        if (sortDir === "desc") {
          return [+1, -1];
        }
        this.setAppFatal("Invalid sort direction");
        return [-1, -1];
      })();
      const ret: number = (condition ? dirYes : dirNo);
      return ret;
    };
    const sorter: Function = (recA: AppBizRec, recB: AppBizRec): number => {
      //
      // Sort Field: Distance
      //
      if (sortField === "distance") {
        const recACompDist: number = (
          (recA.distance === undefined || recA.distance === null) ?
            0 :
            recA.distance
        );
        const recBCompDist: number = (
          (recB.distance === undefined || recB.distance === null) ?
            0 :
            recB.distance
        );
        return checkDir(recACompDist < recBCompDist);
      }
      //
      // Sort Field: Name
      //
      if (sortField === "name") {
        return checkDir(recA.name < recB.name);
      }
      //
      // Sort Field: Location
      //
      if (sortField === "location") {
        const recACompLoc: [string, string] = [
          recA.location.city,
          recA.location.zip_code
        ];
        const recBCompLoc: [string, string] = [
          recB.location.city,
          recB.location.zip_code
        ];
        // $FlowFixMe
        return checkDir(recACompLoc < recBCompLoc);
      }
      //
      // Sort Field: Favorite
      //
      if (sortField === "favorite") {
        return checkDir(this.isFavorite(recA.id), this.isFavorite(recB.id));
      }
      //
      // Default
      //
      this.setAppFatal("Invalid sort field");
      return -1;
    };
    const outRecs: AppBizRecs = bizRecs.sort(sorter.bind(this));
    return outRecs;
  }

  /**
   * Event handler for form submission
   *
   * @param {ReactEvent} - React event
   * @return {Promise<boolean>}
   */
  handleSubmitForm (event: ReactEvent): Promise<boolean> {
    event.preventDefault();
    return this.fetchResults("search", 0);
  }

  /**
   * Builds a GraphQL fragment for a business response
   *
   * @return {string}
   */
  buildQueryStrBizFragment (): string {
    return (
      `
        fragment bizResponse on Business {
          id
          name
          url
          distance
          photos
          location {
            city
            zip_code
          }
          categories {
            title
            alias
          }
        }
      `
    );
  }

  /**
   * Build GraphQL query info for a business search
   *
   * @param {number} limit - Limit
   * @param {number} offset - Offset
   * @param {string} zipCode - Zip Code
   * @param {number} radius - Radius
   * @param {?string} category - Category
   * @return {AppQueryObj}
   */
  buildQueryBizSearch (
    limit: number,
    offset: number,
    zipCode: string,
    radius: number,
    category: ?string=null
  ): AppQueryObj {
    const query: string = (
      `
        ${this.buildQueryStrBizFragment()}

        query appQuery (
          $limit: Int!,
          $offset: Int!,
          $zip_code: String!,
          $radius: Float!,
          $categories: String
        ) {
          search(
            limit: $limit,
            offset: $offset,
            location: $zip_code,
            radius: $radius,
            categories: $categories
          ) {
            total
            business {
              ...bizResponse
            }
          }
        }
      `
    );
    const variables: Object = {
      limit: limit,
      offset: offset,
      zip_code: zipCode,
      radius: radius,
      categories: category
    };
    const res: AppQueryObj = {
      query: query,
      variables: variables
    };
    //console.log(query);
    //console.log(variables);
    return res;
  }

  /**
   * Build GraphQL query info for favorite businesses
   *
   * @param {Array<string>} bizIds - Businesses IDs from Yelp
   * @return {AppQueryObj}
   */
  buildQueryBizFavs (bizIds: Array<string>): AppQueryObj {
    const queryArgs: string = (
      bizIds
        .map((bizId: string, idx: number) => {
          return (
            `$id${idx}: String!`
          );
        })
        .join(", ")
    );
    const bizObjs: string = (
      bizIds
        .map((bizId: string, idx: number) => {
          return (
            `
              b${idx}:business(id: $id${idx}) {
                ...bizResponse
              }
            `
          );
        })
        .join("")
    );
    const query: string = (
      `
        ${this.buildQueryStrBizFragment()}

        query appQuery (${queryArgs}) {
          ${bizObjs}
        }
      `
    );
    const variables: Object = (
      this.arrayToObject (
        bizIds
          .map((bizId: string, idx: number) => {
            return [
              `id${idx}`,
              bizId
            ];
          })
      )
    );
    const res: AppQueryObj = {
      query: query,
      variables: variables
    };
    return res;
  }

  /**
   * Convert an array of tuples to object
   *
   * @param {Array<[any, any]>} pairs - Array of tuples
   * @return {Object}
   */
  arrayToObject (pairs: Array<[any, any]>): Object {
    // $FlowFixMe
    return Object.assign(...pairs.map((pair) => ({[pair[0]]: pair[1]})));
  }

  /**
   * Check if search form should be disabled
   *
   * @return {boolean}
   */
  isFormDisabled (): boolean {
    return (
      (this.state.zipFinal === null)
    );
  }

  /**
   * Export favorites as array
   *
   * @return {Array<string>}
   */
  exportFavorites (): Array<string> {
    if (this.state.favorites === undefined || this.state.favorites === null) {
      this.setAppFatal("favorites must be set");
      return [];
    }
    return Array.from(this.state.favorites.keys());
  }

  /**
   * Fetch and sync favorite results with state
   *
   * @return {boolean}
   */
  fetchFavResults (): Promise<boolean> {
    if (this.state.favorites === undefined || this.state.favorites === null) {
      this.setAppFatal("favorites must be set");
      return this.buildPromise(false);
    }
    if (this.state.favorites.size === 0) {
      return (
        this.setStatePromise(
          {
            fetchMode: "favorite",
            resultsStatus: "ready",
            // By default, sort by name when viewing favorites
            sortField: "name",
            sortDir: "asc",
            selectedCat: null,
            typedCatVal: null,
            zip: null,
            zipFinal: null,
            distanceMiles: DISTANCE_DEFAULT,
            distanceMeters: this.convertMilesToMeters(DISTANCE_DEFAULT),
            offset: 0,
            businessCountTotal: 0,
            businessRecs: []
          }
        )
          .then(() => true)
      );
    }
    const queryObj: AppQueryObj = (
      this.buildQueryBizFavs(
        this.exportFavorites()
      )
    );
    if (this.state.favorites === undefined || this.state.favorites === null) {
      this.setAppFatal("favorites must be set");
      return this.buildPromise(false);
    }
    const favSize: number = this.state.favorites.size;
    return (
      GQL_CLIENT
        .send(queryObj.query, queryObj.variables)
        .catch((error) => {
          this.setAppFatal("Could not send GQL query for biz ids", error);
          return false;
        })
        // Add this step to normalize the response data
        // so it is the same as our search response data
        .then(
          this.convertBizIdResponseRecs.bind(
            this,
            favSize
          )
        )
        .then((data) => {
          return (
            this.setStatePromise({
              fetchMode: "favorite",
              resultsStatus: "ready",
              selectedCat: null,
              typedCatVal: null,
              zip: null,
              zipFinal: null,
              distanceMiles: DISTANCE_DEFAULT,
              distanceMeters: this.convertMilesToMeters(DISTANCE_DEFAULT),
              offset: 0,
              businessCountTotal: data.search.total,
              businessRecs: data.search.business
            })
              .then(() => true)
          );
        })
    );
  }

  /**
   * Fetch results for current search mode
   *
   * @param {number} offset - Offset
   * @param {Promise<boolean>}
   */
  fetchResultsForCurrentMode (offset: number): Promise<boolean> {
    if (this.state.fetchMode === undefined || this.state.fetchMode === null) {
      this.setAppFatal("fetchMode must be set");
      return this.buildPromise(false);
    }
    return this.fetchResults(this.state.fetchMode, offset);
  }

  /**
   * Simple helper method to build a basic
   * promise that just resolves to a simple
   * static value.  This is helpful
   * when keeping Flow happy.
   *
   * @param {any} value - Any value to be returned
   * @return {Promise<any>}
   */
  buildPromise (value: any): Promise<any> {
    return Promise.resolve(value);
  }

  /**
   * Fetch results
   *
   * @param {string} fetchMode - Fetch mode
   * @param {number} offset - Offset
   * @return {boolean}
   */
  fetchResults (fetchMode: string, offset: number): Promise<boolean> {
    return (
      this
        .setStatePromise(
          {
            resultsStatus: "loading"
          }
        )
        .then(
          () => {
            if (fetchMode === "search") {
              return this.fetchSearchResults(offset);
            }
            if (fetchMode === "favorite") {
              return this.fetchFavResults();
            }
            this.setAppFatal("invalid fetchMode");
            return this.buildPromise(false);
          }
        )
    );
  }

  /**
   * General purpose error handler when all else fails
   *
   * @return {void}
   */
  setAppFatal (msg: string, error: any=null): void {
    const newError: Error = new Error(msg);
    // $FlowFixMe
    newError.origError = error;
    throw newError;
  }

  /**
   * Handle click button to show favorites
   *
   * @param {ReactEvent} event - React event
   * @return {Promsie<boolean>}
   */
  handleClickShowFavorites (event: ReactEvent): Promise<boolean> {
    event.preventDefault();
    return this.fetchResults("favorite", 0);
  }

  /**
   * Convert business id response records
   *
   * @param {number} totalCount - Total count of all records
   * @param {Object} resObj - Business response object
   * @return {Object}
   */
  convertBizIdResponseRecs (totalCount: number, resObj: Object): Object {
    // $FlowFixMe
    const recs: AppBizRecs = Object.values(resObj);
    const data: Object = {
      search: {
        total: totalCount,
        business: recs
      }
    };
    return data;
  }

  /**
   * Render favorites link
   *
   * @return {ReactNode}
   */
  renderLinkFavorites (): ReactNode {
    return (
      <div className="form-group ml-5">
        <button
            id="inp-show-favs"
            className="btn btn-success"
            onClick={this.handleClickShowFavorites.bind(this)}>
          Show All Favorites
        </button>
      </div>
    );
  }

  /**
   * Event handler which does nothing
   * Useful for disabling submits
   *
   * @param {ReactEvent} event - React event
   * @return {boolean}
   */
  handleNoop (event: ReactEvent): boolean {
    event.preventDefault();
    return false;
  }

  /**
   * Render form search bar
   *
   * @return {ReactNode}
   */
  renderInputs (): ReactNode {
    const isDisabled: boolean = this.isFormDisabled();
    const submitter: ?Function = (
      isDisabled ?
        this.handleNoop.bind(this) :
        this.handleSubmitForm.bind(this)
    );
    return (
      <form
          id="search_bar"
          className="form-inline justify-content-center pt-3 pb-3"
          onSubmit={submitter}>
        {this.renderInputDistance()}
        {this.renderInputZipcode()}
        {this.renderInputCategories()}
        {this.renderInputSubmit()}
        {this.renderLinkFavorites()}
      </form>
    );
  }

  /**
   * Render search submit button
   *
   * @return {ReactNode}
   */
  renderInputSubmit (): ReactNode {
    const isDisabled: boolean = this.isFormDisabled();
    return (
      <div className="form-group">
        <button
            id="inp-search-submit"
            className="btn btn-primary"
            type="submit"
            disabled={isDisabled}>
          Search
        </button>
      </div>
    );
  }

  /**
   * Render section containing business listing results
   *
   * @return {ReactNode}
   */
  renderResults (): ReactNode {
    return (
      <div>
        {this.renderBusinessSection()}
      </div>
    );
  }

  /**
   * Render for application ready state
   *
   * @return {ReactNode}
   */
  renderReady (): ReactNode {
    return (
      <main>
        {this.renderInputs()}
        {this.renderResults()}
      </main>
    );
  }

  /**
   * Check if app is ready
   *
   * @return {boolean}
   */
  checkAppIsReady (): boolean {
    return (
      (this.state.catTrie !== null) &&
        (this.state.favorites !== null)
    );
  }

  /**
   * Render main section below header
   *
   * @return {ReactNode}
   */
  render (): ReactNode {
    if (!this.checkAppIsReady()) {
      return this.renderLoading();
    }
    return this.renderReady();
  }

}


export default AppMain;

