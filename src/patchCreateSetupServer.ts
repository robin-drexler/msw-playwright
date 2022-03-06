import { readFileSync, appendFileSync } from "fs";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

function patchCreateSetupServerIntoExistence() {
  const mswLibPath = require.resolve("msw/node/lib/index");
  const mswLibPathContent = readFileSync(mswLibPath, "utf8");

  if (mswLibPathContent.includes("exports.createSetupServer")) {
    return;
  }

  appendFileSync(
    mswLibPath,
    "\nexports.createSetupServer = createSetupServer;\n"
  );
}

export function importCreateSetupServer() {
  patchCreateSetupServerIntoExistence();

  return require("msw/node/lib/index");
}
