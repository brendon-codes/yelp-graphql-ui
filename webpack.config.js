
"use strict";

const Webpack = require("webpack");
const Extend = require("util")._extend;
const Path = require("path");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

//process.traceDeprecation = true;

const BuildBase = function (inJs, outJs, outCss) {
  return {
    devtool: "#source-map",
    watch: true,
    entry: {
      site: inJs
    },
    output: {
      filename: outJs
    },
    plugins: [
      new Webpack.EnvironmentPlugin({
        NODE_ENV: "development",
        DEBUG: true
      }),
      new Webpack.ProvidePlugin({
        "$": "jquery",
        "jQuery": "jquery",
        "window.jQuery": "jquery",
        "window.Popper": "popper.js",
        "Popper": "popper.js"
      }),
      new ExtractTextPlugin({
        filename: outCss
      })
      //new UglifyJsPlugin({
      //  uglifyOptions: {
      //    compress: true,
      //    mangle: true
      //  },
      //  sourceMap: false
      //})
    ],
    module: {
      rules: [
        {
          test: /\.js$/,
          use: [
            {
              loader: "jsx-loader"
            },
            {
              loader: "babel-loader",
              options: {
                compact: true
              }
            },
            {
              loader: "exports-loader"
            }
          ],
          exclude: /node_modules/
        },
        {
          test: /\.scss$/,
          use: ExtractTextPlugin.extract({
            fallback: "style-loader",
            use: [
              {
                loader: "css-loader",
                options: {
                  sourceMap: true,
                  minimize: false
                }
              },
              {
                loader: "sass-loader"
              }
            ]
          })
        },
        {
          test: /\.css$/,
          use: ExtractTextPlugin.extract({
            fallback: "style-loader",
            use: [
              {
                loader: "css-loader",
                options: {
                  sourceMap: true,
                  minimize: false
                }
              }
            ]
          })
        },
        {
          test: /\.(png|woff|woff2|eot|ttf|svg)$/,
          use: [
            {
              loader: "url-loader"
            }
          ]
        }
      ]
    }
  };
};

const configSite = (
  BuildBase(
    "./src/assets/index.js",
    "./src/webroot/protector.js",
    "./src/webroot/protector.css"
  )
);

const configs = [
  configSite
];


module.exports = configs;
