var substitutions = require(__dirname + '/properties.json');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

var DefinePlugin = new webpack.DefinePlugin(substitutions);
console.log('DefinePlugin: ' + JSON.stringify(DefinePlugin));

module.exports = {
  entry: {
    index: './app/index.js',
    layout: './app/layout.js',
    signin: './app/signin.js'
  },
  output: {
    path: __dirname + '/dist',
    filename: "[name]_bundle.js"
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
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: 'body',
      chunks: ['layout', 'index'],
      template: __dirname + '/app/index.html',
      filename: 'index.html'
    }),
    new HtmlWebpackPlugin({
      inject: 'body',
      chunks: ['layout', 'signin'],
      template: __dirname + '/app/signin.html',
      filename: 'signin.html'
    }),
    DefinePlugin
  ]
};
