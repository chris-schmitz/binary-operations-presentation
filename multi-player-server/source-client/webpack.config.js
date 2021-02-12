const webpack = require('webpack')
const path = require('path')

const config = {
  entry: {
    gameboard: './brick-controller/index.ts',
    controller: './game-board/index.ts',
  },

  output: {
    path: path.resolve(__dirname, '..', 'dist/public'),
    publicPath: '',
    filename: '[name]/[name].js',
  },
  module: {
    rules: [
      {
        test: /\.ts(x)?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
}

module.exports = config
