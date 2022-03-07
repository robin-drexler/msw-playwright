import typescript from "@rollup/plugin-typescript";

import externals from "rollup-plugin-node-externals";

const name = "msw-playwright";

export default {
  input: "src/index.ts",
  plugins: [
    // `declarationDir` seems to be relative to the the output dir.
    // not changing it to ./ causes d.ts files to end up in a ./dist/dist folder.
    typescript({
      tsconfig: "./tsconfig.json",
      declarationDir: "./",
      exclude: ["./**/tests/**/*.*"],
    }),
    externals({ deps: true }),
  ],
  output: [
    {
      file: `dist/${name}.cjs`,
      format: "cjs",
      sourcemap: true,
    },
    {
      file: `dist/${name}.mjs`,
      format: "es",
      sourcemap: true,
    },
  ],
};
