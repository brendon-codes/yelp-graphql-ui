
"use strict";

const Webpack = require("webpack");
const Extend = require("util")._extend;
const Path = require("path");
//const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
//const ExtractTextPlugin = require("extract-text-webpack-plugin");

//process.traceDeprecation = true;

const BuildBase = function (inJs, outJs, outCss) {
  return {
    devtool: "inline-source-map",
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
        NODE_ENV: "development",
        DEBUG: true
      }),
      // new ExtractTextPlugin({
      //   filename: outCss
      // })
    ],
    module: {
      rules: [
        {
          test: /\.js$/,
          use: [
            {
              loader: "ts-loader"
            },
            // {
            //   loader: "babel-loader",
            //   options: {
            //     compact: true
            //   }
            // }
          ],
          exclude: /node_modules/
        }
        // {
        //   test: /\.scss$/,
        //   use: ExtractTextPlugin.extract({
        //     fallback: "style-loader",
        //     use: [
        //       {
        //         loader: "css-loader",
        //         options: {
        //           sourceMap: true,
        //           minimize: false
        //         }
        //       },
        //       {
        //         loader: "sass-loader"
        //       }
        //     ]
        //   })
        // },
        // {
        //   test: /\.css$/,
        //   use: ExtractTextPlugin.extract({
        //     fallback: "style-loader",
        //     use: [
        //       {
        //         loader: "css-loader",
        //         options: {
        //           sourceMap: true,
        //           minimize: false
        //         }
        //       }
        //     ]
        //   })
        // },
        // {
        //   test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        //   use: [
        //     {
        //       loader: "url-loader"
        //     }
        //   ]
        // }
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
