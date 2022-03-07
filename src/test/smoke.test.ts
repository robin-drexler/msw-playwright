import test from "ava";

import { rest } from "msw";
import { chromium } from "playwright";

import { setupServerForPage } from "../index";

test("smoke test", async (t) => {
  const browser = await chromium.launch({ headless: false });
  const page = await (await browser.newContext()).newPage();

  const handlers = [
    rest.get("https://iframesarelife.com", (_req, res, ctx) => {
      return res(
        ctx.xml(
          "<html><body><h1>Hello from msw-mocked iframe</h1></body></html>"
        )
      );
    }),
  ];

  const server = setupServerForPage(page)(...handlers);
  server.listen({ onUnhandledRequest: "bypass" });

  page.route("https://example.org", (route) => {
    route.fulfill({
      body: `
        <h1>Hello World</h1>
        <iframe id="mocked-iframe" src="https://iframesarelife.com"></iframe>
        <iframe id="unmocked-iframe" src="https://httpbin.org/anything?test=unmocked"></iframe>
      `,
    });
  });

  await page.goto("https://example.org");
  await page.waitForSelector("#mocked-iframe");

  // assert mocking worked
  {
    const elementHandle = await page.$("#mocked-iframe");
    const frame = await elementHandle?.contentFrame();
    const text = await frame?.textContent("body");

    t.truthy(text?.includes("msw-mocked iframe"));
  }

  // assert not mocking requests works
  {
    const elementHandle = await page.$("#unmocked-iframe");
    const frame = await elementHandle?.contentFrame();
    const text = await frame?.textContent("body");
    t.truthy(text?.includes("unmocked"));
  }
});
