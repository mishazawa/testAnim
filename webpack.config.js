const glob = require('glob');
const path = require('path');
const PugPlugin = require('pug-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const SVGSpritemapPlugin = require('svg-spritemap-webpack-plugin');

function generatePages() {
  let obj = {};
	// Find all the pug files in the pages directory
	let pages = glob.sync('*.pug', {
		cwd: path.join(__dirname, './src/components/pages/'),
	});

	// Generate key: value obj for entry all pages with existing file-names
	pages.map((page) => {
		let pageName = `${page.replace('.pug', '')}`;
    let pageFullName = path.resolve(__dirname, 'src/components/pages/', page);
    
    obj[pageName] = pageFullName;
	});

  return obj;
}

module.exports = {
  entry: {
		// Insert your PUG files here
    ...generatePages()
  },

  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: `assets/js/[name].js`,
    assetModuleFilename: (pathData) => {
			const filepath = path.dirname(pathData.filename)
				.replace('src/', '');
      return `${filepath}/[name][ext]`;
    },
  },

  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    port: 9000,
    watchFiles: {
			// Enables HMR in these folders
      paths: ['src/**/*.*', 'assets/scss/**/*.*'],
      options: {
        usePolling: true
      }
    }
  },

	stats: 'errors-only',
	
  watch: false,

	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
			'styles': path.resolve(__dirname, 'src/assets/styles'),
			'fonts': path.resolve(__dirname, 'src/assets/fonts'),
			'images': path.resolve(__dirname, 'src/assets/images'),
			'videos': path.resolve(__dirname, 'src/assets/videos'),
			'components': path.resolve(__dirname, 'src/components'),
			'js': path.resolve(__dirname, 'src/js'),
		},
	},

  plugins: [
    new PugPlugin({
      pretty: true,
      extractCss: {
        filename: 'assets/css/[name].css'
      }
    }),

		// Copy all images in dev folder
    new CopyWebpackPlugin({
			patterns: [
				{from:'src/assets/images/content',to:'assets/images/content'},
        {from:'src/assets/images/general',to:'assets/images/general'},
        {from:'src/assets/models',to:'assets/models'},
        {from:'src/assets/images/favicon',to:'assets/images/favicon'} 
			]
		}), 

		// Generate SVG Sprite
    new SVGSpritemapPlugin('src/assets/images/svg/*.svg', {
			output: {
				filename: 'assets/images/svg/svg-sprite.svg',
				svg4everybody: {
					polyfill: true,
				},
				svgo: {
					plugins: [
						{
							name: 'inlineStyles',
							params: { onlyMatchedOnce: false }
						},
						{
							name: 'cleanupIDs',
							params: { minify: false }
						},
						{
							name: 'removeAttrs',
							params: {attrs: '*:(stroke|fill)*'}
						}
					]
				}
			},
			sprite: {
				generate: {title: false},
				prefix: false,
				gutter: 5,
			},
		}),
  ],

  optimization: {
		minimize: true,
		moduleIds: 'deterministic',
		innerGraph: true,
		concatenateModules: true,
		minimizer: [
			new TerserPlugin({
				extractComments: false,
			})
		],
		splitChunks: {
      minSize: 10000,
			minChunks: 1,
			cacheGroups: {
				defaultVendors: {
					chunks: 'all',
					name: "vendors",
					test: /[\\/]node_modules[\\/].+\.(js|ts)$/,
					enforce: true,
				}
			}
		}
	},

  module: {
    rules: [
			// Load Pug files
      {
        test: /\.pug$/,
        loader: PugPlugin.loader
      },

			// Load Sass files
      {
        test: /\.(css|sass|scss)$/,
        use: [
          'css-loader', 
          {
						loader: 'postcss-loader',
						options: {
							postcssOptions: {
								plugins: [
									[
										'postcss-preset-env',
										{
											browsers: 'last 10 versions',
										},
									],
								],
							},
						},
					},
          'sass-loader'
				]
      },

			// To use images in pug files:
      {
        test: /\.(png|jpe?g|svg|ico|gif|webmanifest|mp4|webp|webm|gltf|glb)/,
        type: 'asset/resource',
      },

			// To use fonts in pug files:
      {
        test: /\.(woff|woff2)$/i,
        type: 'asset/resource',
      }
    ]
  }
};
