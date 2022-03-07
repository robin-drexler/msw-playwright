import { chromium, type Browser, type Page, type Route } from "playwright";
import { setupServer } from "msw/node";
import { importCreateSetupServer } from "./patchCreateSetupServer";

const { createSetupServer } = importCreateSetupServer();

import {
  type Observer,
  type Resolver,
  type IsomorphicRequest,
  type IsomorphicResponse,
} from "@mswjs/interceptors";

import { Headers, flattenHeadersObject } from "headers-polyfill";

export function setupServerForPage(page: Page): typeof setupServer {
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
