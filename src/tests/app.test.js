
import React from "react";
import { shallow, mount, render } from "enzyme";
import { createWaitForElement } from "enzyme-wait";

import App from "../assets/components/app";


describe(
  "Testing App Component",
  () => {
    const setupAppComponent = async () => {
      const app = shallow(<App />);
      const data = await app.instance().loadInitData();
      app.updateDom();
      return app
    }

    test(
      "App Test 1",
      async () => {
        const app = await setupAppComponent();
        expect(app.find("h1")).toHaveLength(1);
        const table = app.find("table");
        expect(table).toHaveLength(1);
        const tbody = table.find("tbody");
        expect(tbody).toHaveLength(1);
        const rows = tbody.find("tr");
        expect(rows.length).toBeGreaterThanOrEqual(1);
        return undefined;
      }
    );
  }
);


