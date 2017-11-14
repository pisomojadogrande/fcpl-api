var substitutions = require(__dirname + '/properties.json');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

var DefinePlugin = new webpack.DefinePlugin(substitutions);
console.log('DefinePlugin: ' + JSON.stringify(DefinePlugin));

module.exports = {
  entry: {
    accountsetup: './app/accountsetup.js',
    controls: './app/controls.js',
    index: './app/index.js',
    layout: './app/layout.js',
    passwordreset: './app/passwordreset.js',
    signin: './app/signin.js',
    signup: './app/signup.js',
    styles: './app/styles.css'
  },
  output: {
    path: __dirname + '/dist',
    filename: "[name]_bundle.js"
  },
  module: {
    loaders: [
      {
          test: /\.css$/, 
          loader: 'style-loader!css-loader?modules=true&localIdentName=[name]__[local]___[hash:base64:5]'
      },
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
      chunks: ['layout', 'controls', 'accountsetup'],
      template: __dirname + '/app/accountsetup.html',
      filename: 'accountsetup.html'
    }),
    new HtmlWebpackPlugin({
      inject: 'body',
      chunks: ['styles', 'layout', 'index'],
      template: __dirname + '/app/index.html',
      filename: 'index.html'
    }),
    new HtmlWebpackPlugin({
      inject: 'body',
      chunks: ['layout', 'controls', 'passwordreset'],
      template: __dirname + '/app/passwordreset.html',
      filename: 'passwordreset.html'
    }),
    new HtmlWebpackPlugin({
      inject: 'body',
      chunks: ['layout', 'controls', 'signin'],
      template: __dirname + '/app/signin.html',
      filename: 'signin.html'
    }),
    new HtmlWebpackPlugin({
      inject: 'body',
      chunks: ['layout', 'controls', 'signup'],
      template: __dirname + '/app/signup.html',
      filename: 'signup.html'
    }),
    DefinePlugin
  ]
};
