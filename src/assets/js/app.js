
// @flow

import React from "react";

import { Lokka } from "lokka";
import { Transport as LokkaTransport } from "lokka-transport-http";

import Autosuggest from "react-autosuggest";
import TrieSearch from "trie-search";
import Dexie from "dexie";

import config from "./config";

const BIZ_SEARCH_LIMIT: number = 10;
const CAT_SEARCH_LIMIT: number = 10;
const CAT_CLEAN_RE: RegExp = new RegExp("[^A-Za-z0-9]+", "g");
const DISTANCE_MAX_MILES: number = 25;
const DISTANCE_DEFAULT: number = 1;

const GQL_CLIENT: Lokka = (
  new Lokka({
    transport: new LokkaTransport("/graphql", {
      headers: {
        "Authorization": ["Bearer", config.YELP_TOKEN].join(" "),
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
      // This should either be "search" or "favorite"
      fetchMode: null,
      offset: 0,
      favorites: null,
      catTrie: null,
      suggestedCats: [],
      selectedCat: null,
      typedCatVal: null,
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
            placeholder: "Search Categories",
            value: this.getSuggCatValue(),
            onChange: this.handleSuggCatChange.bind(this)
          }}
        />
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
        this.setState({
          favorites: this.preProcessFavorites(obj.favorites),
          catTrie: this.preProcessCategories(obj.categories)
        })
      });
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
    const ts = (
      new TrieSearch(
        "clean",
        {
          min: 1,
          ignoreCase: false,
          splitOnRegEx: undefined
        }
      )
    );
    for (let i in cats) {
      if (!cats.hasOwnProperty(i)) {
        continue;
      }
      const cat = cats[i];
      const newCat: Object = buildCat(cat);
      ts.add(newCat);
    }
    return ts;
  }

  renderBusinesses (): Object {
    if (this.state.businessRecs === null) {
      return (
        <div>
          Use the search form to find businesses near you.
        </div>
      );
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
    const start: number = this.state.offset;
    const end: number = this.state.offset + this.state.businessRecs.length;
    return (
      <div>
        <div>
          Displaying{" "}
          <strong>{start}</strong>{" "}
          <span dangerouslySetInnerHTML={{__html: "&mdash;"}} />{" "}
          <strong>{end}</strong>{" "}
          of{" "}
          <strong>{this.state.businessCountTotal}</strong>{" "}
          results.
        </div>
        <div>
          <a {...optsPrev}>Prev</a>{" "}
          <a {...optsNext}>Next</a>
        </div>
        <table>
          <tbody>
            {this.state.businessRecs.map(this.renderBusinessRec.bind(this))}
          </tbody>
        </table>
      </div>
    );
  }

  pageResults (pageCount: number, event: Object): boolean {
    event.preventDefault();
    const offset: number = this.getPageOffset(pageCount);
    this.fetchResults(offset);
    return false;
  }

  getPageLinkInfo (): Array {
    const offset: number = this.state.offset;
    const bizTotal: ?number = this.state.businessCountTotal;
    const totalIsNull: boolean = (bizTotal === null);
    const showPrev: boolean = (!totalIsNull && (offset > 0));
    const showNext: boolean = (
      (!totalIsNull && ((offset + BIZ_SEARCH_LIMIT) <= bizTotal))
    );
    //debugger;
    return [showPrev, showNext];
  }

  getPageOffset (pageCount: number): Object {
    const incVal: number = BIZ_SEARCH_LIMIT * pageCount;
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
        ["fa", "fa-star", "star-selected"] :
        ["fa", "fa-star-o"]
    )
    return (
      <tr key={biz.id}>
        <td>
          <span
              onClick={this.handleClickFav.bind(this, biz.id)}
              className={this.buildClassNames(classes)}>
          </span>
        </td>
        <td>{biz.name}</td>
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
      <div>
        <input
           onChange={this.handleChangeZip.bind(this)}
           placeholder="5 Digit Zip"
           type="text"
           value={zipVal} />
      </div>
    );
  }

  convertMilesToMeters (miles: number): number {
    if (miles >= DISTANCE_MAX_MILES) {
      return 40000;
    }
    return (miles * 1609.344);
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
    const nums: Array = this.range(1, DISTANCE_MAX_MILES + 1);
    return (
      <div>
        <select
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

  renderLoading (): Object {
    return (
      <div>
        Loading...
      </div>
    );
  }

  fetchSearchResults (): boolean {
    const varCat: ?String = (
      (this.state.selectedCat === null) ?
        null :
        this.state.selectedCat.alias
    );
    const queryObj: Object = (
      this.buildQueryBizSearch(
        BIZ_SEARCH_LIMIT,
        this.state.offset,
        this.state.zip,
        this.state.distanceMeters,
        varCat
      )
    );
    GQL_CLIENT
      .send(queryObj.query, queryObj.variables)
      .then((data) => {
        this.setState({
          businessCountTotal: data.search.total,
          businessRecs: data.search.business
        });
      })
    return true;
  }

  handleSubmitForm (event: Object): boolean {
    event.preventDefault();
    this.setState(
      {
        fetchMode: "search"
      },
      this.fetchResults.bind(this, 0)
    );
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
          location {
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
    distance: number,
    category: ?String
  ) {
    const query: String = (
      `
        ${this.queryBusinessFragment()}

        query appQuery (
          $limit: Int!,
          $offset: Int!,
          $zip_code: String!,
          $distance: Float!,
          $categories: String
        ) {
          search(
            limit: $limit,
            offset: $offset,
            location: $zip_code,
            radius: $distance,
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
      distance: distance,
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

  buildQueryBizFavs (limit: number, offset: number, bizIds: Array) {
    const slicedBizIds: Array = bizIds.slice(offset, limit);
    const queryArgs: String = (
      slicedBizIds
        .map((bizId: String, idx: number) => {
          return (
            `$id${idx}: String!`
          )
        })
        .join(", ")
    )
    const bizObjs: String = (
      slicedBizIds
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
        slicedBizIds
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
    const queryObj: Object = (
      this.buildQueryBizFavs(
        BIZ_SEARCH_LIMIT,
        this.state.offset,
        this.exportFavorites()
      )
    );
    GQL_CLIENT
      .send(queryObj.query, queryObj.variables)
    // Add this step to normalize the response data
    // so it is the same as our search response data
      .then(this.convertBizIdResponseRecs.bind(this))
      .then((data) => {
        this.setState({
          businessCountTotal: data.search.total,
          businessRecs: data.search.business
        });
      })
    return true;
  }

  fetchResults (offset: number): boolean {
    this.setState(
      {
        offset: offset
      },
      () => {
        if (this.state.fetchMode === "search") {
          this.fetchSearchResults();
          return true;
        }
        if (this.state.fetchMode === "favorite") {
          this.fetchFavResults();
          return true;
        }
        this.setAppFatal();
      }
    );
    return true;
  }

  setAppFatal (msg): boolean {
    throw new Error(msg);
  }

  handleClickShowFavorites (event: Object): boolean {
    event.preventDefault();
    this.setState(
      {
        fetchMode: "favorite",
        selectedCat: null,
        typedCatVal: null,
        zip: null,
        zipFinal: null,
        distanceMiles: DISTANCE_DEFAULT,
        distanceMeters: this.convertMilesToMeters(DISTANCE_DEFAULT)
      },
      this.fetchResults.bind(this, 0)
    );
    return false;
  }

  convertBizIdResponseRecs (resObj): Object {
    const recs: Array = Object.values(resObj);
    const data: Object = {
      search: {
        total: recs.length,
        business: recs
      }
    }
    return data;
  }

  renderLinkFavorites (): Object {
    return (
      <div>
        <a
            href="#"
            onClick={this.handleClickShowFavorites.bind(this)}>
          Show All Favorites
        </a>
      </div>
    );
  }

  renderInputs (): Object {
    const isDisabled: boolean = this.isFormDisabled();
    const submitter: ?Function = (
      isDisabled ?
        (() => false) :
        this.handleSubmitForm.bind(this)
    );
    return (
      <form onSubmit={submitter}>
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
      <div>
        <button type="submit" disabled={isDisabled}>Search</button>
      </div>
    );
  }

  renderResults (): Object {
    return (
      <div>
        {this.renderBusinesses()}
      </div>
    );
  }

  renderReady (): Object {
    return (
      <div>
        {this.renderInputs()}
        {this.renderResults()}
      </div>
    );
  }

  render (): Object {
    if (
      (this.state.catTrie === null) &&
        (this.state.favorites !== null)
    ) {
      return this.renderLoading();
    }
    return this.renderReady();
  }

}


export default App;

