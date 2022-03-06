import { readFileSync, appendFileSync } from "fs";

export function patchCreateSetupServerIntoExistence() {
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
