# boites (boites)

Boites à secrets

## Install the dependencies
```bash
yarn
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```

### Lint the files
```bash
yarn run lint
```

### Build the app for production
```bash
quasar build -m pwa
```

### Customize the configuration
See [Configuring quasar.conf.js](https://v2.quasar.dev/quasar-cli/quasar-conf-js).

Visual Studio : "vetur.experimental.templateInterpolationService": false

### Polyfill de node
Ce polyfill fournit Buffer stream util zlib etc, beaucoup de choses utiles. En Webpack 5 ces choses ne sont pas reprises, alors qu'en Webpack 4 c'était le cas.

Ce besoin a été supprimé mais s'il redevenait nécessaire :

      yarn add --dev node-polyfill-webpack-plugin

Dans quasar.conf.js build: {}
      chainWebpack (chain) {
        const nodePolyfillWebpackPlugin = require('node-polyfill-webpack-plugin')
        chain.plugin('node-polyfill').use(nodePolyfillWebpackPlugin)
      }

### raw-loader
Requis pour gérer les .md et .txt en tant que ressources. Dans quasar.conf.js build: 

      extendWebpack (cfg) {
        cfg.module.rules.push({
          test: /\.md$/i,
          use: 'raw-loader'
        })
        cfg.module.rules.push({
          test: /\.txt$/i,
          use: 'raw-loader'
        })
      },
      chainWebpack (chain) {
        chain.plugin('eslint-webpack-plugin')
          .use(ESLintPlugin, [{ extensions: ['js', 'vue'] }])
      }

### IndexedDB : fake pour emoji-picker sous Firefox en mode privé
indexedDB ne fonctionne pas sur Firefox en mode privé. 

fake-indexeddb a fonctionné correctement avec emoji-picker mais c'est tordu : voir dans src/boot/appconfig.js comment il a fallu le configurer (et seulement pour le cas emoji-picker)

### Base des emojis
https://cdn.jsdelivr.net/npm/emoji-picker-element-data@%5E1/en/emojibase/data.json

Ce lien vers la base des emojis permet de le recopier dans public/emoji.json

