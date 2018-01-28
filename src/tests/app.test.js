
// @flow

import Autosuggest from "react-autosuggest";
import React from "react";
import { shallow, mount, render, ShallowWrapper as Shallow } from "enzyme";
import { createWaitForElement } from "enzyme-wait";

import AppMain from "../assets/components/app/main";

// Need to add this to keep Flow happy
const { describe, test, expect } = global;

describe(
  "Testing App Component",
  () => {
    const setupAppSearchData: Function = async (): Promise<Shallow> => {
      const app: Shallow = shallow(<AppMain />);
      const data: Promise<boolean> = await app.instance().loadInitData();
      await app.updateDom();
      return app
    };

    const setupAppInitData: Function = async (): Promise<Shallow> => {
      const app: Shallow = shallow(<AppMain />);
      const data: Promise<boolean> = await app.instance().loadInitData();
      app.updateDom();
      return app
    };

    const buildFakeEventClick: Function = (): Object => {
      return {
        preventDefault: (() => true)
      }
    };

    const buildFakeEventSubmit: Function = (): Object => {
      return {
        preventDefault: (() => true)
      }
    };

    const buildFakeEventAutosuggestChange: Function = (val: string): Object => {
      return {
        newValue: val
      }
    };

    const matchPagerInfo: Function = (
      (text: string): ?Object => {
        const patt: string = (
          "^Displaying\\s+([0-9]+)\\s+\\u2014\\s+" +
            "([0-9]+)\\s+of\\s+([0-9]+)\\s+search\\s+results$"
        );
        const pagerMatch: ?Array<any> = text.match(new RegExp(patt, "u"));
        expect(pagerMatch).not.toBeNull();
        if (pagerMatch === undefined || pagerMatch === null) {
          return null;
        }
        const start: number = parseInt(pagerMatch[1], 10);
        const end: number = parseInt(pagerMatch[2], 10);
        const total: number = parseInt(pagerMatch[3], 10);
        return {
          start: start,
          end: end,
          total: total
        };
      }
    );

    test(
      "Initial load show correct pager information.",
      async (): Promise<boolean> => {
        const app: Shallow = await setupAppInitData();
        const pagerInfo: Shallow = app.find("div#pager-info");
        const matcher: ?Object = matchPagerInfo(pagerInfo.text());
        expect(matcher).not.toBeNull();
        // Keep flow happy
        if (matcher === undefined || matcher === null) {
          return true;
        }
        expect(matcher.start).toBe(0);
        expect(matcher.end).toBeGreaterThanOrEqual(1);
        expect(matcher.total).toBeGreaterThanOrEqual(1);
        return true;
      }
    );

    test(
      "Previous and Next Paging Works.",
      async (): Promise<boolean> => {
        const app: Shallow = await setupAppInitData();
        //
        // Test next
        //
        const prevPre: Shallow = app.find("a#page-prev");
        expect(prevPre).toHaveLength(1);
        expect(prevPre.props()).not.toHaveProperty("href");
        const next: Shallow = app.find("a#page-next");
        expect(next).toHaveLength(1);
        expect(next.props()).toHaveProperty("href");
        await next.props().onClick(buildFakeEventClick());
        await app.updateDom();
        const pagerInfo1: Shallow = app.find("div#pager-info");
        const matcher1: ?Object = matchPagerInfo(pagerInfo1.text());
        expect(matcher1).not.toBeNull();
        // Keep flow happy
        if (matcher1 === undefined || matcher1 === null) {
          return true;
        }
        expect(matcher1.start).toBeGreaterThanOrEqual(1);
        expect(matcher1.end).toBeGreaterThanOrEqual(1);
        expect(matcher1.total).toBeGreaterThanOrEqual(1);
        //
        // Now test previous
        //
        const prev: Shallow = app.find("a#page-prev");
        expect(prev).toHaveLength(1);
        expect(prev.props()).toHaveProperty("href");
        await prev.props().onClick(buildFakeEventClick());
        await app.updateDom();
        const pagerInfo2: Shallow = app.find("div#pager-info");
        const matcher2: ?Object = matchPagerInfo(pagerInfo2.text());
        expect(matcher2).not.toBeNull();
        // Keep flow happy
        if (matcher2 === undefined || matcher2 === null) {
          return true;
        }
        expect(matcher2.start).toBe(0);
        expect(matcher2.end).toBeGreaterThanOrEqual(1);
        expect(matcher2.total).toBeGreaterThanOrEqual(1);
        return true;
      }
    );

    test(
      "Initial load has search results.",
      async (): Promise<boolean> => {
        const app: Shallow = await setupAppInitData();
        const table: Shallow = app.find("table");
        expect(table).toHaveLength(1);
        const tbody: Shallow = table.find("tbody");
        expect(tbody).toHaveLength(1);
        const rows: Shallow = tbody.find("tr");
        expect(rows.length).toBeGreaterThanOrEqual(1);
        return true;
      }
    );

    test(
      "Can add and view favorites.",
      async (): Promise<boolean> => {
        const app: Shallow = await setupAppInitData();
        //
        // First check before adding fav
        //
        const table1: Shallow = app.find("table");
        expect(table1).toHaveLength(1);
        const tbody1: Shallow = table1.find("tbody");
        expect(tbody1).toHaveLength(1);
        const rows1: Shallow = tbody1.find("tr");
        expect(rows1.length).toBeGreaterThanOrEqual(1);
        const row1: Shallow = rows1.at(0);
        const favItem1: Shallow = row1.find("span.fav-item");
        expect(favItem1).toHaveLength(1);
        expect(favItem1.hasClass("heart-noselect"));
        expect(!favItem1.hasClass("heart-select"));
        //
        // Now add fav
        //
        await favItem1.props().onClick(buildFakeEventClick());
        await app.updateDom();
        //
        // Now check after adding fav
        //
        const table2: Shallow = app.find("table");
        expect(table2).toHaveLength(1);
        const tbody2: Shallow = table2.find("tbody");
        expect(tbody2).toHaveLength(1);
        const rows2: Shallow = tbody2.find("tr");
        expect(rows2.length).toBeGreaterThanOrEqual(1);
        const row2: Shallow = rows2.at(0);
        const nameCell2: Shallow = row2.find("td.rec-biz-name");
        expect(nameCell2).toHaveLength(1);
        const nameText2: string = nameCell2.text();
        const favItem2: Shallow = row2.find("span.fav-item");
        expect(favItem2).toHaveLength(1);
        expect(!favItem2.hasClass("heart-noselect"));
        expect(favItem2.hasClass("heart-select"));
        //
        // Now see if fav is in our favorites listing
        //
        const showButt: Shallow = app.find("button#inp-show-favs");
        expect(showButt).toHaveLength(1);
        await showButt.props().onClick(buildFakeEventClick());
        await app.updateDom();
        const table3: Shallow = app.find("table");
        expect(table3).toHaveLength(1);
        const tbody3: Shallow = table3.find("tbody");
        expect(tbody3).toHaveLength(1);
        const rows3: Shallow = tbody3.find("tr");
        expect(rows3).toHaveLength(1);
        const row3: Shallow = rows3.at(0);
        const nameCell3: Shallow = row3.find("td.rec-biz-name");
        expect(nameCell3).toHaveLength(1);
        const nameText3: string = nameCell3.text();
        expect(nameText3).toEqual(nameText2);
        return true;
      }
    );

    test(
      "Niche category gives no search results.",
      async (): Promise<boolean> => {
        const app: Shallow = await setupAppInitData();
        const zip: Shallow = app.find("input#inp-zip");
        expect(zip).toHaveLength(1);
        await zip.simulate(
          "change",
          {target: {value: "90404"}}
        );
        // For some reason, we cant get Autosuggest to
        // mount here without errors.
        // But we can still simulate the event
        const autoSuggest: Shallow = app.find(Autosuggest);
        await autoSuggest.props().inputProps.onChange(
          {},
          buildFakeEventAutosuggestChange("Zorbing")
        )
        const searchForm: Shallow = app.find("form#search_bar");
        expect(searchForm).toHaveLength(1);
        await searchForm.props().onSubmit(buildFakeEventSubmit());
        await app.updateDom();
        const emptyRes: Shallow = app.find("div#msg-empty-results");
        expect(emptyRes).toHaveLength(1);
        const patt: string = (
          "^No\\ssearch\\sresults\\sare\\savailable\.$"
        );
        const emptyResMatch = emptyRes.text().match(new RegExp(patt, "u"));
        expect(emptyResMatch).not.toBeNull();
        return true;
      }
    );

  }
);


