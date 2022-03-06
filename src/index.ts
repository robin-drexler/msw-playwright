import { chromium, type Browser, type Page, type Route } from "playwright";
import { rest } from "msw";
import { patchCreateSetupServerIntoExistence } from "./patchCreateSetupServer";

patchCreateSetupServerIntoExistence();

const { createSetupServer } = require("msw/node/lib/index");

import {
  type Observer,
  type Resolver,
  type IsomorphicRequest,
  type IsomorphicResponse,
} from "@mswjs/interceptors";

import { Headers, flattenHeadersObject } from "headers-polyfill";

function createServerForPage(page: Page) {
  function createInterceptorModuleForPage(page: Page) {
    return function interceptor(observer: Observer, resolver: Resolver) {
      function routeHandler() {
        /**
         * @param {import('playwright').Route} route
         */
        return async (route: Route) => {
          const request = route.request();

          const isoRequest: IsomorphicRequest = {
            id: String(Math.random()) + String(Math.random()),
            url: new URL(request.url()),
            method: request.method(),
            headers: new Headers(await request.allHeaders()),
            credentials: "omit",
            body: request.postData() ?? undefined,
          };

          observer.emit("request", isoRequest);

          const mockedResponse = await resolver(isoRequest, {} as any);

          if (mockedResponse) {
            /**
             * @type {import('@mswjs/interceptors').IsomorphicResponse}
             */
            const isomorphicResponse: IsomorphicResponse = {
              // TODO ensure status exists 🫖
              status: mockedResponse.status ?? 418,
              statusText: mockedResponse.statusText ?? "",
              body: mockedResponse.body,
              headers: new Headers(mockedResponse.headers),
            };

            observer.emit("response", isoRequest, isomorphicResponse);

            route.fulfill({
              status: mockedResponse.status,
              body: mockedResponse.body,
              headers: mockedResponse.headers
                ? flattenHeadersObject(mockedResponse.headers)
                : {},
            });
            return;
          }

          const forwardedResponse = await page.request.fetch(route.request());

          observer.emit("response", isoRequest, {
            status: forwardedResponse.status(),
            statusText: forwardedResponse.statusText(),
            headers: new Headers(await forwardedResponse.headers()),
            body: await forwardedResponse.text(),
          });

          route.fulfill({ response: forwardedResponse });
        };
      }

      page.route("**/*", routeHandler());

      return function () {
        page.unroute("**/*", routeHandler);
      };
    };
  }

  return createSetupServer(createInterceptorModuleForPage(page));
}

/**
 *
 * @param {import('playwright').Browser} browser
 */
async function doStuff(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  const handlers = [
    rest.get("https://iframesarelife.com", (req, res, ctx) => {
      return res(
        ctx.xml(
          "<html><body><h1>Hello from msw-mockediFrame</h1></body></html>"
        )
      );
    }),
  ];

  const server = createServerForPage(page)(...handlers);

  server.listen({ onUnhandledRequest: "warn" });

  page.route("https://example.org", (route) => {
    route.fulfill({
      body: `
        <h1>Hello World</h1>
        <img src="http://placekitten.com/200/300" />
        <iframe src="https://iframesarelife.com" />
      `,
    });
  });

  await page.goto("https://example.org");
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  await doStuff(browser);
  // await doStuff(browser);

  // browser.close();
})();
