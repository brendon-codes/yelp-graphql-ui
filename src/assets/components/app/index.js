
// @flow

import React from "react";

import { Lokka } from "lokka";
import { Transport as LokkaTransport } from "lokka-transport-http";

import Fontawesome from "font-awesome/scss/font-awesome.scss";
import Autosuggest from "react-autosuggest";
import TrieSearch from "trie-search";
import Dexie from "dexie";

import AppStyle from "./app.scss";

const BIZ_SEARCH_LIMIT: number = 20;
const BIZ_DISPLAY_LIMIT: number = 20;
const CAT_SEARCH_LIMIT: number = 10;
const CAT_CLEAN_RE: RegExp = new RegExp("[^A-Za-z0-9]+", "g");
const DISTANCE_MILES_MAX: number = 25;
const DISTANCE_METERS_MAX: number = 40000;
const DISTANCE_METERS_PER_MILE: number = 1609.344;
const DISTANCE_DEFAULT: number = 1;

const GQL_CLIENT: Lokka = (
  new Lokka({
    transport: new LokkaTransport("/graphql", {
      //
      // We do not set the Authorization header here
      // which contains the Yelp token.
      // Instead, we proxy through our own server,
      // which sets the Authorization header.
      // This way, we do not leak keys to clients.
      //
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "en_US"
      }
    })
  })
);

const DB: Dexie = new Dexie("dsyelp");
DB.version(1).stores({
  favorites: "&business_id"
});
DB.open();


class App extends React.Component {

  constructor(props: Object, context: Object) {
    super(props, context);
    this.setDefaultState();
  }

  buildDefaultState (): Object {
    return {
      //
      // Loading status of business results.
      // This can apply to both favorites and search.
      // Possible values:
      //
      // - "ready"
      // - "loading"
      //
      resultsStatus: "ready",
      //
      // Type of business fetch to be done.
      // Possible values:
      //
      // - "search"
      // - "favorite"
      // - null
      //
      fetchMode: null,
      //
      // Status of geo loader
      // Possible values:
      //
      // - "waiting"
      // - "ready"
      //
      geoStatus: "waiting",
      //
      // This is the field which is being sorted on.
      // Possible values:
      //
      // - "distance"
      // - "name"
      // - "location"
      // - "favorite"
      //
      sortField: "distance",
      //
      // This is the sort direction of the sorted field.
      // Possible values:
      //
      // - "asc"
      // - "desc"
      //
      sortDir: "asc",
      offset: 0,
      favorites: null,
      catTrie: null,
      suggestedCats: [],
      selectedCat: "restaurants",
      typedCatVal: "Restaurants",
      zip: null,
      zipFinal: null,
      distanceMiles: DISTANCE_DEFAULT,
      distanceMeters: this.convertMilesToMeters(DISTANCE_DEFAULT),
      businessRecs: null,
      businessCountTotal: null
    }
  }

  setDefaultState (): boolean {
    this.state = this.buildDefaultState();
    return true;
  }

  searchCategories (value) {
    const cleanVal: String = this.cleanCatTitle(value);
    const res = this.state.catTrie.get(cleanVal).slice(0, CAT_SEARCH_LIMIT);
    return res;
  }

  handleSuggCatsFetchRequested ({ value }): boolean {
    this.setState({
      suggestedCats: this.searchCategories(value)
    });
    return true;
  };

  handleSuggCatsClearRequested (): boolean {
    this.setState({
      suggestedCats: []
    });
    return true;
  };

  getSuggCatValue (cat): String {
    return cat.alias;
  }

  renderSuggCat (cat): Object {
    return (
      <div>
        {cat.title}
      </div>
    );
  }

  findSingleCat (value) {
    const cleanVal: String = this.cleanCatTitle(value);
    const res = this.state.catTrie.get(cleanVal);
    if (res.length !== 1) {
      return null;
    }
    if (res[0].clean !== cleanVal) {
      return null;
    }
    return res[0];
  }

  handleSuggCatChange (event, {newValue}): boolean {
    const selectedCat = this.findSingleCat(newValue);
    const catVal: ?String = (
      (newValue === "") ?
        null :
        newValue
    );
    this.setState({
      typedCatVal: catVal,
      selectedCat: selectedCat
    })
    return true;
  }

  handleSuggCatSelected (
    event,
    {
      suggestion,
      suggestionValue,
      suggestionIndex,
      sectionIndex,
      method
    }
  ): boolean {
    this.setState({
      typedCatVal: suggestion.title,
      selectedCat: suggestion
    })
    return true;
  }

  getSuggCatValue (): String {
    return (
      (this.state.typedCatVal === null) ?
        "" :
        this.state.typedCatVal
    );
  }

  renderInputCategories (): Object {
    return (
      <div className="form-group mr-2">
        <Autosuggest
            suggestions={this.state.suggestedCats}
            onSuggestionsFetchRequested={
              this.handleSuggCatsFetchRequested.bind(this)
            }
            onSuggestionsClearRequested={
              this.handleSuggCatsClearRequested.bind(this)
            }
            onSuggestionSelected={this.handleSuggCatSelected.bind(this)}
            getSuggestionValue={this.getSuggCatValue.bind(this)}
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

  componentWillMount (): boolean {
    this.loadInitData();
    return true;
  }

  loadInitData (): boolean {
    Promise
      .all([
        this.loadCategories(),
        this.loadFavorites()
      ])
      .then(resGroups => {
        return {
          categories: resGroups[0],
          favorites: resGroups[1]
        };
      })
      .then(obj => {
        this.setState(
          {
            favorites: this.preProcessFavorites(obj.favorites),
            catTrie: this.preProcessCategories(obj.categories)
          },
          this.loadInitGeoData.bind(this)
        )
      });
    return true;
  }

  enableGeoReady (zipCode: ?String=null) {
    this.setState(
      {
        geoStatus: "ready",
        zipFinal: zipCode,
        zip: zipCode
      },
      this.fetchResults.bind(this, "search", 0)
    );
    return true;
  }

  loadInitGeoData (): boolean {
    this.enableGeoReady("90402");
    return true;

    if(!navigator.geolocation) {
      this.enableGeoReady();
      return false;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log(position);
        this.enableGeoReady();
        return true;
      },
      () => {
        this.enableGeoReady();
        return true;
      }
    );
    return true;
  }

  preProcessFavorites (favorites): Set {
    const results: Set = new Set(favorites.map(fav => fav.business_id));
    return results;
  }

  loadFavorites () {
    return (
      DB
        .favorites
        .toArray(favorites => favorites)
    );
  }

  loadCategories () {
    return (
      fetch(
        "/categories",
        {
          method: "GET"
        }
      )
      .then(response => response.json())
    );
  }

  cleanCatTitle (val: String): String {
    return val.replace(CAT_CLEAN_RE, "").toLowerCase();
  }

  preProcessCategories (cats) {
    const buildCat: Function = (cat: Object): Object => {
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
    const builtCats: Array = cats.map(buildCat.bind(this));
    ts.addAll(builtCats);
    return ts;
  }

  renderLoading (): Object {
    return (
      <div className="row pt-5">
        <div className="col text-center">
          <span className="fa fa-refresh fa-spin fa-3x fa-fw"></span>
        </div>
      </div>
    );
  }

  renderWaitingForAction (): Object {
    return (
      <div className="row pt-5">
        <div className="col font-italic text-center">
          Search for businesses and activities in your area!
        </div>
      </div>
    );
  }

  renderBusinessSection (): Object {
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
    if (this.state.businessRecs === null) {
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

  renderBusinessesReady (): Object {
    return (
      <div className="mt-3">
        {this.renderPagerBox()}
        {this.renderResultsTable()}
      </div>
    );
  }

  renderPagerBox (): Object {
    return (
      <div className="row mb-1 justify-content-between">
        {this.renderPagerText()}
        {this.renderPagerNav()}
      </div>
    );
  }

  renderResultsEmpty (): Object {
    const resultLabel: String = this.getFetchModeText();
    return (
      <div className="row pt-5">
        <div className="col font-italic text-center">
          No {resultLabel} are available.
        </div>
      </div>
    );
  }

  handleClickRowHeadField (code, event: Object): boolean {
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
    opts.businessRecs = (
      this.sortBizRecs(
        this.state.businessRecs,
        opts.sortField,
        opts.sortDir
      )
    );
    this.setState(opts);
    return false;
  }

  renderRowHeadField (val: String, code: String): Object {
    const iconClassName: Object = (() => {
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
    const linkClassName: String = (
      selected ?
        "sorter-select" :
        "sorter-noselect"
    );
    const sortIcon: Object = (
      selected ?
      (
        <span>
          <span
              className={this.buildClassNames(["fa", iconClassName])}></span>
          &nbsp;
        </span>
      ) :
      []
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

  renderResultsTable (): Object {
    return (
      <table>
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
          {this.state.businessRecs.map(this.renderBusinessRec.bind(this))}
        </tbody>
      </table>
    );
  }

  renderPagerNav (): Object {
    if (this.state.fetchMode !== "search") {
      return [];
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
        <a {...optsPrev}>Previous</a>
        &nbsp;&nbsp;<span className="pager-sep">|</span>&nbsp;&nbsp;
        <a {...optsNext}>Next</a>
      </div>
    );
  }

  getFetchModeText (): String {
    if (this.state.fetchMode === "search") {
      return "search results";
    }
    if (this.state.fetchMode === "favorite") {
      return "favorites";
    }
    this.setAppFatal();
    return "";
  }

  renderPagerText (): Object {
    const resultLabel: String = this.getFetchModeText();
    const start: number = this.state.offset;
    const end: number = this.state.offset + this.state.businessRecs.length;
    return (
      <div className="col font-italic">
        Displaying{" "}
        <strong>{start}</strong>{" "}
        &mdash;{" "}
        <strong>{end}</strong>{" "}
        of{" "}
        <strong>{this.state.businessCountTotal}</strong>{" "}
        {resultLabel}
      </div>
    );
  }

  pageResults (pageCount: number, event: Object): boolean {
    event.preventDefault();
    const offset: number = this.getPageOffset(pageCount);
    this.fetchResultsForCurrentMode(offset);
    return false;
  }

  getPageLinkInfo (): Array {
    const offset: number = this.state.offset;
    const bizTotal: ?number = this.state.businessCountTotal;
    const totalIsNull: boolean = (bizTotal === null);
    const showPrev: boolean = (!totalIsNull && (offset > 0));
    const showNext: boolean = (
      (!totalIsNull && ((offset + BIZ_DISPLAY_LIMIT) <= bizTotal))
    );
    //debugger;
    return [showPrev, showNext];
  }

  getPageOffset (pageCount: number): Object {
    const incVal: number = BIZ_DISPLAY_LIMIT * pageCount;
    const checkOffset: number = this.state.offset + incVal;
    const totalIsNull: boolean = (this.state.businessCountTotal === null);
    const offset: number = (() => {
      if (checkOffset <= 0) {
        return 0
      }
      if (totalIsNull) {
        return 0;
      }
      if (checkOffset > this.state.businessCountTotal) {
        return this.state.offset
      }
      return checkOffset;
    })();
    return offset;
  }

  buildClassNames (classNames: Array): string {
    return (
      classNames
        .filter((v) => (v !== null))
        .join(" ")
    );
  }

  doesBizHavFav (bizId: String): boolean {
    const res: boolean = this.state.favorites.has(bizId);
    return res;
  }

  isFavorite (bizId: string): boolean {
    return (
      (this.state.favorites !== null) &&
        (this.state.favorites.has(bizId))
    );
  }

  removeFavorite (bizId: String): boolean {
    DB
      .favorites
      .where("business_id")
      .equals(bizId)
      .limit(1)
      .delete()
      .then(this.reloadFavorites.bind(this));
    return true;
  }

  reloadFavorites (operation): boolean {
    return (
      this
        .loadFavorites()
        .then(favorites => {
          this.setState({
            favorites: this.preProcessFavorites(favorites)
          });
          return true;
        })
    );
  }

  addFavorite (bizId: String): boolean {
    DB
      .favorites
      .put({
        "business_id": bizId
      })
      .then(this.reloadFavorites.bind(this));
    return true;
  }

  handleClickFav (bizId: String, event: Object): Object {
    const isFav: boolean = this.isFavorite(bizId);
    if (isFav) {
      this.removeFavorite(bizId);
      return true;
    }
    this.addFavorite(bizId);
    return true;
  }

  renderBusinessRec (biz: Object): Object {
    const selected: boolean = this.doesBizHavFav(biz.id);
    const classes: Array = (
      selected ?
        ["fa", "fa-heart", "heart-select"] :
        ["fa", "fa-heart", "heart-noselect"]
    )
    const photoUrl: ?String = (
      (biz.photos.length > 0) ?
        biz.photos[0] :
        null
    );
    const photo: Object = (
      (photoUrl !== null) ?
        (
          <img className="logo" src={photoUrl} />
        ) :
        []
    );
    const loc: Array = [];
    if (biz.location.hasOwnProperty("city") && (biz.location.city !== null)) {
      loc.push(biz.location.city);
    }
    if (
      biz.location.hasOwnProperty("zip_code") &&
       (biz.location.zip_code !== null)
    ) {
      loc.push(biz.location.zip_code);
    }
    const locStr: String = (
      (loc.length > 0) ?
        loc.join(", ") :
        " "
    );
    const milesStr: String = (
      (biz.hasOwnProperty("distance") && (biz.distance !== null)) ?
        this.convertMetersToMiles(biz.distance).toString() :
        " "
    );
    return (
      <tr key={biz.id}>
        <td>
          {photo}
        </td>
        <td>
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

  handleChangeZip (event: Object) {
    const val: ?String = (
      (event.target.value === "") ?
        null :
        event.target.value
    );
    const checkGood: RegExp = new RegExp("^[0-9]{1,5}(-[0-9]{0,4})?$");
    if (val !== null && !val.match(checkGood)) {
      return true;
    }
    const checkFinal: RegExp = new RegExp("^[0-9]{5}(-[0-9]{4})?$");
    const zipFinal: ?String = (
      (val !== null && !val.match(checkFinal)) ?
        null :
        val
    );
    this.setState({
      zip: val,
      zipFinal: zipFinal
    });
    return true;
  }

  renderInputZipcode (): Object {
    const zipVal: ?String = (
      (this.state.zip === null) ?
        "" :
        this.state.zip
    );
    return (
      <div className="form-group mr-2">
        <input
           className="form-control"
           onChange={this.handleChangeZip.bind(this)}
           placeholder="Zip Code"
           type="text"
           value={zipVal} />
      </div>
    );
  }

  convertMetersToMiles (meters: number): number {
    if (meters >= DISTANCE_METERS_MAX) {
      return DISTANCE_MILES_MAX;
    }
    return (
      parseFloat((meters / DISTANCE_METERS_PER_MILE).toFixed(1))
    );
  }

  convertMilesToMeters (miles: number): number {
    if (miles >= DISTANCE_MILES_MAX) {
      return DISTANCE_METERS_MAX;
    }
    return (miles * DISTANCE_METERS_PER_MILE);
  }

  handleChangeDistance (event): boolean {
    const miles: number = parseInt(event.target.value, 10);
    const meters: number = this.convertMilesToMeters(miles);
    this.setState({
      distanceMiles: miles,
      distanceMeters: meters
    });
    return true;
  }

  renderInputDistance (): Object {
    const val: number = this.state.distanceMiles;
    const nums: Array = this.range(1, DISTANCE_MILES_MAX + 1);
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

  range (start: number, end: number): Array {
    return Array.from({length: (end - start)}, (v, k) => k + start);
  }

  fetchSearchResults (offset: number): boolean {
    const varCat: ?String = (
      (this.state.selectedCat === null) ?
        null :
        this.state.selectedCat.alias
    );
    const queryObj: Object = (
      this.buildQueryBizSearch(
        BIZ_SEARCH_LIMIT,
        offset,
        this.state.zip,
        this.state.distanceMeters,
        varCat
      )
    );
    GQL_CLIENT
      .send(queryObj.query, queryObj.variables)
      .then((data) => {
        this.setState({
          fetchMode: "search",
          resultsStatus: "ready",
          offset: offset,
          businessCountTotal: data.search.total,
          businessRecs: this.sortBizRecsFromState(data.search.business)
        });
      })
    return true;
  }

  sortBizRecsFromState (bizRecs: Array): Array {
    return this.sortBizRecs(bizRecs, this.state.sortField, this.state.sortDir);
  }

  sortBizRecs (bizRecs: Array, sortField: String, sortDir: String): Array {
    const checkDir: Function = (condition): boolean => {
      const [dirYes: number, dirNo: number] = (() => {
        if (sortDir === "asc") {
          return [-1, +1];
        }
        if (sortDir === "desc") {
          return [+1, -1];
        }
        this.setAppFatal("Invalid sort direction");
        return -1;
      })();
      const ret: number = (condition ? dirYes : dirNo);
      return ret;
    };
    const sorter: Function = (recA: Object, recB: Object) => {
      //
      // Sort Field: Distance
      //
      if (sortField === "distance") {
        return checkDir(recA.distance < recB.distance);
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
        return (
          checkDir(
            [
              recA.location.city,
              recA.location.zip_code
            ] <
              [
                recB.location.city,
                recB.location.zip_code
              ]
          )
        );
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
    const outRecs: Array = bizRecs.sort(sorter.bind(this));
    return outRecs;
  }

  handleSubmitForm (event: Object): boolean {
    event.preventDefault();
    this.fetchResults("search", 0)
    return false;
  }

  queryBusinessFragment () {
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

  buildQueryBizSearch (
    limit: number,
    offset: number,
    zipCode: String,
    radius: number,
    category: ?String=null
  ) {
    const query: String = (
      `
        ${this.queryBusinessFragment()}

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
    const res: Object = {
      query: query,
      variables: variables
    };
    console.log(query);
    console.log(variables);
    return res;
  }

  buildQueryBizFavs (bizIds: Array) {
    const queryArgs: String = (
      bizIds
        .map((bizId: String, idx: number) => {
          return (
            `$id${idx}: String!`
          )
        })
        .join(", ")
    )
    const bizObjs: String = (
      bizIds
        .map((bizId: String, idx: number) => {
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
    const query: String = (
      `
        ${this.queryBusinessFragment()}

        query appQuery (${queryArgs}) {
          ${bizObjs}
        }
      `
    );
    const variables: Object = (
      this.arrayToObject (
        bizIds
          .map((bizId: String, idx: number) => {
            return [
              `id${idx}`,
              bizId
            ]
          })
      )
    );
    const res: Object = {
      query: query,
      variables: variables
    };
    return res;
  }

  arrayToObject (pairs: Array): Object {
    return Object.assign(...pairs.map((pair) => ({[pair[0]]: pair[1]})))
  }

  isFormDisabled (): boolean {
    return (
      (this.state.zipFinal === null)
    );
  }

  exportFavorites (): Array {
    return Array.from(this.state.favorites.keys());
  }

  fetchFavResults (): boolean {
    if (this.state.favorites.size === 0) {
      this.setState({
        fetchMode: "favorite",
        resultsStatus: "ready",
        selectedCat: null,
        typedCatVal: null,
        zip: null,
        zipFinal: null,
        distanceMiles: DISTANCE_DEFAULT,
        distanceMeters: this.convertMilesToMeters(DISTANCE_DEFAULT),
        offset: 0,
        businessCountTotal: 0,
        businessRecs: []
      });
      return true;
    }
    const queryObj: Object = (
      this.buildQueryBizFavs(
        this.exportFavorites()
      )
    );
    GQL_CLIENT
      .send(queryObj.query, queryObj.variables)
      // Add this step to normalize the response data
      // so it is the same as our search response data
      .then(
        this.convertBizIdResponseRecs.bind(
          this,
          this.state.favorites.size
        )
      )
      .then((data) => {
        this.setState({
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
        });
      })
    return true;
  }

  fetchResultsForCurrentMode (offset: number): boolean {
    return this.fetchResults(this.state.fetchMode, offset);
  }

  fetchResults (fetchMode: String, offset: number): boolean {
    this.setState(
      {
        resultsStatus: "loading"
      },
      () => {
        if (fetchMode === "search") {
          this.fetchSearchResults(offset);
          return true;
        }
        if (fetchMode === "favorite") {
          this.fetchFavResults();
          return true;
        }
        this.setAppFatal();
        return false;
      }
    )
    return false;
  }

  setAppFatal (msg): boolean {
    throw new Error(msg);
  }

  handleClickShowFavorites (event: Object): boolean {
    event.preventDefault();
    this.fetchResults("favorite", 0)
    return false;
  }

  convertBizIdResponseRecs (totalCount: number, resObj): Object {
    const recs: Array = Object.values(resObj);
    const data: Object = {
      search: {
        total: totalCount,
        business: recs
      }
    }
    return data;
  }

  renderLinkFavorites (): Object {
    return (
      <div className="form-group ml-5">
        <button
            className="btn btn-success"
            onClick={this.handleClickShowFavorites.bind(this)}>
          Show All Favorites
        </button>
      </div>
    );
  }

  handleNoop (event: Object): boolean {
    event.preventDefault();
    return false;
  }

  renderInputs (): Object {
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

  renderInputSubmit (): Object {
    const isDisabled: boolean = this.isFormDisabled();
    return (
      <div className="form-group">
        <button
            className="btn btn-primary"
            type="submit"
            disabled={isDisabled}>
          Search
        </button>
      </div>
    );
  }

  renderResults (): Object {
    return (
      <div>
        {this.renderBusinessSection()}
      </div>
    );
  }

  renderReady (): Object {
    return (
      <main>
        {this.renderInputs()}
        {this.renderResults()}
      </main>
    );
  }

  renderHeader (): Object {
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

  render (): Object {
    return (
      <div className="container" data-component="app">
        {this.renderHeader()}
        {this.renderMain()}
      </div>
    );
  }

  checkAppIsReady (): boolean {
    return (
      (this.state.catTrie !== null) &&
        (this.state.favorites !== null) &&
        (this.state.geoStatus === "ready")
    );
  }

  renderMain (): Object {
    if (!this.checkAppIsReady()) {
      return this.renderLoading();
    }
    return this.renderReady();
  }

}


export default App;

