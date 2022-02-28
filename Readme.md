# msw-playwright

This is just a proof of concept for now

## Getting started

```
npm i
node index.js
```

## Why?

### Why msw and not use playwright's `route`s?

If you already have handlers in `msw`, you can re-use them for your browser tests as well.

### Why not use `msw` inside the browser user service workers

While you could use your handlers inside the browser instance, what they could do would be limited to the browser environment and the setup would be more complex as well.
E.g. inside node, you can read the file system, do database queries etc.
