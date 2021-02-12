const webpack = require('webpack')
const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')

const brickControllerDirectoryName = 'brick-controller'
const gameBoardDirectoryName = 'gameboard'

const config = {
  entry: {
    'brick-controller': `./${brickControllerDirectoryName}/index.ts`,
    gameboard: `./${gameBoardDirectoryName}/index.ts`,
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
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: `./${brickControllerDirectoryName}`,
          to: 'brick-controller',
          globOptions: {
            ignore: ['**/*.ts'],
          },
        },
        {
          from: `./${gameBoardDirectoryName}`,
          to: 'gameboard',
          globOptions: {
            ignore: ['**/*.ts'],
          },
        },
      ],
    }),
  ],
}

module.exports = config
