const path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'animbg.min.js',
    publicPath: 'dist/',
  },
  devtool: 'source-map',
}
