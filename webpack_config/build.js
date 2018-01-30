
/**
 * This is the webpack config more suitable
 * for a production build. This produces much smaller
 * js and css files, and doesnt include source maps.
 * This does not start the watcher.
 */

"use strict";

const Webpack = require("webpack");
const Extend = require("util")._extend;
const Path = require("path");
var FlowBabelWebpackPlugin = require("flow-babel-webpack-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");


const BuildBase = function (inJs, outJs, outCss) {
  return {
    devtool: false,
    watch: false,
    entry: {
      site: inJs
    },
    output: {
      filename: outJs
    },
    resolve: {
      extensions: [".js"]
    },
    plugins: [
      new Webpack.EnvironmentPlugin({
        NODE_ENV: "production",
        DEBUG: false
      }),
      new FlowBabelWebpackPlugin(),
      new UglifyJsPlugin({
        uglifyOptions: {
          compress: true,
          mangle: true
        },
        sourceMap: false
      }),
      new ExtractTextPlugin({
        filename: outCss
      }),
    ],
    module: {
      rules: [
        {
          test: /\.js$/,
          use: [
            {
              loader: "babel-loader",
              options: {
                compact: true
              }
            },
            {
              loader: "eslint-loader"
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
                  minimize: true
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
                  minimize: true
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
    "./src/webroot/dsyelp.js",
    "./src/webroot/dsyelp.css"
  )
);

const configs = [
  configSite
];


module.exports = configs;
