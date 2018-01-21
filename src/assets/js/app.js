
// @flow

import React from "react";

import { Lokka } from "lokka";
import { Transport as LokkaTransport } from "lokka-transport-http";

import Autosuggest from "react-autosuggest";
import TrieSearch from "trie-search";

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

const QUERY_BUSINESSES = (
  `
    query appQuery (
      $zip_code: String!,
      $distance: Float!,
      $categories: String
    ) {
      search(
        location: $zip_code,
        radius: $distance,
        categories: $categories
      ) {
        total
        business {
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
      }
    }
  `
);


class App extends React.Component {

  constructor(props: Object, context: Object) {
    super(props, context);
    this.setDefaultState();
  }

  buildDefaultState (): Object {
    return {
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
    this.loadCategories();
    return true;
  }

  loadCategories (): boolean {
    fetch(
      "/categories",
      {
        method: "GET"
      }
    )
      .then(response => response.json())
      .then(data => {
        this.setState({
          catTrie: this.preProcessCategories(data)
        });
        return true;
      });
    return true;
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
    return (
      <table>
        <tbody>
          {this.state.businessRecs.map(biz =>
            <tr key={biz.id}>
              <td>{biz.name}</td>
            </tr>
          )}
        </tbody>
      </table>
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

  handleSubmitForm (event: Object): boolean {
    event.preventDefault();
    const varCat: ?String = (
      (this.state.selectedCat === null) ?
        null :
        this.state.selectedCat.alias
    );
    const queryVars: Object = {
      zip_code: this.state.zip,
      distance: this.state.distanceMeters,
      categories: varCat
    };
    GQL_CLIENT
      .query(QUERY_BUSINESSES, queryVars)
      .then((data) => {
        this.setState({
          businessCountTotal: data.search.total,
          businessRecs: data.search.business
        });
      })
    return false;
  }

  isFormDisabled (): boolean {
    return (
      (this.state.zipFinal === null)
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
    if (this.state.catTrie === null) {
      return this.renderLoading();
    }
    return this.renderReady();
  }

}


export default App;

