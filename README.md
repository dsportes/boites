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
quasar build
```

### Customize the configuration
See [Configuring quasar.conf.js](https://v2.quasar.dev/quasar-cli/quasar-conf-js).

Visual Studio : "vetur.experimental.templateInterpolationService": false


Ce polyfill fournit Buffer stream util zlib etc. Beaucoup de choses utiles pour avsc
En Webpack 5 ces choses ne sont pas reprises, alors qu'en Webpack 4 c'était le cas

yarn add --dev node-polyfill-webpack-plugin

Dans quasar.conf.js build: {}
      chainWebpack (chain) {
        const nodePolyfillWebpackPlugin = require('node-polyfill-webpack-plugin')
        chain.plugin('node-polyfill').use(nodePolyfillWebpackPlugin)
      }

indexedDB ne fonctionne pas sur Firefox en mode privé : fake-indexeddb n'a pas fonctionné
correctement avec emoji-picker. Donc pas de Firefox en mode privé (à la limite pas d'emoji picker)

https://cdn.jsdelivr.net/npm/emoji-picker-element-data@%5E1/en/emojibase/data.json

Lien vers la base des emojis (recopiée en public/emoji.json)
