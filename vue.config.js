const webpack = require('webpack')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const ZipPlugin = require('zip-webpack-plugin')
const fs = require('fs')

const
    PORT = process.env.PORT || 8080,
    IS_PRODUCTION = process.env.NODE_ENV === 'production'

module.exports = {
    filenameHashing: false,
    pages: {
        index: {
            entry: 'src/main.js',
        },
        embed: {
            entry: 'src/embed.js',
        },
        background: {
            entry: 'src/background.js',
        },
    },
    devServer: {
        ...(!fs.existsSync('../private.key') ? {} : {
            https: true,
            key: fs.readFileSync('../private.key'),
            cert: fs.readFileSync('../private.pem'),
        }),
        port: PORT,
        public: `0.0.0.0:${PORT}`,
        disableHostCheck: true,
        watchOptions: {
            ignored: [/node_modules/, /public\/screenshots/],
        },
        // writeToDisk: true,
    },
    ...(IS_PRODUCTION ? { publicPath: 'https://factnotate.io/' } : {}),
    configureWebpack () {
        const data = {
            output: {
                filename: '[name].js',
            },
            devtool: !IS_PRODUCTION ? 'eval-inline-source-map' : false,
            plugins: [
                new webpack.DefinePlugin({
                    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                    IS_PRODUCTION: JSON.stringify(IS_PRODUCTION),
                    ROOT_URL: JSON.stringify(IS_PRODUCTION ? 'https://factnotate.io' : 'https://localhost:8080'),
                    GUN_URLS: JSON.stringify([IS_PRODUCTION ? 'https://gun.factnotate.io' : 'http://localhost:7200']),
                    POPULATE_TEXT_LINES: JSON.stringify(fs.existsSync('./populate.txt') ? fs.readFileSync('./populate.txt', 'utf-8').split('\n').filter(l => l.trim().length > 0) : null),
                }),
                new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
                // new HTMLInlineCSSWebpackPlugin(),
            ],
        }
        if (process.env.ANALYSE === '1') {
            if (!process.env.VUE_CLI_MODERN_MODE || process.env.VUE_CLI_MODERN_BUILD) {
                data.plugins.push(new BundleAnalyzerPlugin())
            }
        }
        data.plugins.push(new ZipPlugin({
            filename: 'factnotate-web-extension.zip',
            include: ['embed.js', 'background.js', 'manifest.json', 'logo.png'],

            // OPTIONAL: see https://github.com/thejoshwolfe/yazl#addfilerealpath-metadatapath-options
            fileOptions: {
                mtime: new Date(),
                mode: 0o100664,
                compress: true,
                forceZip64Format: false,
            },

            // OPTIONAL: see https://github.com/thejoshwolfe/yazl#endoptions-finalsizecallback
            zipOptions: {
                forceZip64Format: false,
            },
        }))
        return data
    },
    chainWebpack: config => {
        config.optimization.delete('splitChunks')
    },
}
