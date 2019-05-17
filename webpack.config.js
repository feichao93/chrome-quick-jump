const path = require('path')

module.exports = {
  context: __dirname,
  target: 'web',
  entry: {
    'quick-jump': path.resolve(__dirname, 'src/main.tsx'),
  },

  output: {
    path: path.resolve(__dirname, 'quick-jump/dist'),
    filename: '[name].js',
  },

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          transpileOnly: true,
        },
      },
      {
        test: /\.css$/,
        loaders: ['style-loader', 'css-loader'],
      },
    ],
  },
}
