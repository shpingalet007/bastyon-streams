const path = require("path");
const webpack = require("webpack");

const config = {
  entry: "./src/main.js",
  output: {
    filename: "bastyon-streams.min.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      type: "umd",
      name: "BastyonStreams",
      export: "default",
    },
  },
  plugins: [],
  module: {
    rules: [
      {
        test: /\.js$/i,
        loader: "babel-loader",
      },
    ],
  },
};

module.exports = (env) => {
  if (env.production) {
    config.mode = "production";
  } else {
    config.mode = "development";
  }
  return config;
};
