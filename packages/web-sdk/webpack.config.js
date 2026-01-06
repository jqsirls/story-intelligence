const path = require('path');

module.exports = {
  entry: './src/StorytellerWebSDK.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'storyteller.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'StorytellerWebSDK',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  optimization: {
    minimize: true,
  },
};