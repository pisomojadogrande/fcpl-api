var config = require(__dirname + '/properties.json');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

var HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
  template: __dirname + '/app/index.html',
  filename: 'index.html',
  inject: 'body'
});
console.log('HTMLWebpackPlugin: ' + JSON.stringify(HTMLWebpackPluginConfig));

var DefinePlugin = new webpack.DefinePlugin(config);
console.log('DefinePlugin: ' + JSON.stringify(DefinePlugin));

module.exports = {
  entry: [
    './app/index.js'
  ],
  output: {
    path: __dirname + '/dist',
    filename: "index_bundle.js"
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: "babel-loader",
        exclude: /node_modules/,
        query: {
          presets: ['react']
        }
      }
    ]
  },
  plugins: [HTMLWebpackPluginConfig, DefinePlugin]
};