const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

// Add new blocks here — one entry per block
const blocks = ["cta-button"];

module.exports = {
  mode: "production",

  entry: blocks.reduce(function (entries, block) {
    entries[block] = "./blocks/" + block + "/main.js";
    return entries;
  }, {}),

  output: {
    filename: "[name]/main.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },

  plugins: [
    new CopyPlugin({
      patterns: blocks.flatMap(function (block) {
        return [
          {
            from: "blocks/" + block + "/index.html",
            to: block + "/index.html",
          },
          {
            from: "blocks/" + block + "/styles.css",
            to: block + "/styles.css",
            noErrorOnMissing: true,
          },
          // icon.png and dragIcon.png are copied automatically if present
          {
            from: "blocks/" + block + "/icon.png",
            to: block + "/icon.png",
            noErrorOnMissing: true,
          },
          {
            from: "blocks/" + block + "/dragIcon.png",
            to: block + "/dragIcon.png",
            noErrorOnMissing: true,
          },
        ];
      }),
    }),
  ],
};
