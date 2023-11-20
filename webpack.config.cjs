const path = require("path");
const webpack = require("webpack");

module.exports = (env) => {
  const getConfig = (fileName, output, exportName) => ({
    mode: env.production ? "production" : "development",
    entry: `./src/${fileName}`,
    output: {
      filename: output,
      path: path.resolve(__dirname, "dist"),
      library: {
        type: "umd",
        name: exportName,
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
  });

  return [
    getConfig("main.js", "streams.min.js", "StreamiumCreator"),
    getConfig("bastyon.js", "bastyon-streams.min.js", "BastyonStreamsCreator"),
  ];
};
