import appTools, { defineConfig } from '@modern-js/app-tools';
import { ModuleFederationPlugin } from '@module-federation/enhanced';
import { RuntimeGlobals } from 'webpack';

const JavascriptModulesPlugin = require('webpack/lib/javascript/JavascriptModulesPlugin');

class AsyncEntryStartupPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'AsyncEntryStartupPlugin',
      compilation => {
        JavascriptModulesPlugin.getCompilationHooks(
          compilation,
        ).renderStartup.tap(
          'AsyncEntryStartupPlugin',
          (source, renderContext, upperContext) => {

            if (upperContext.chunk.hasRuntime()) {
              return source;
            }
            const startup = [
              'var promiseTrack = [];',
              `if(__webpack_require__.f && __webpack_require__.f.remotes) __webpack_require__.f.remotes(${JSON.stringify(
                upperContext.chunk.id,
              )}, promiseTrack);`,
              `if(__webpack_require__.f && __webpack_require__.f.consumes) __webpack_require__.f.consumes(${JSON.stringify(
                upperContext.chunk.id,
              )}, promiseTrack);`,
              `var __webpack_exports__ = Promise.all(promiseTrack).then(function() {`,
              source.source(),
              'return __webpack_exports__;',
              `});`,
            ].join('\n');

            return startup;
          },
        );
      },
    );
  }
}

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
  server: {
    port: 3002,
  },
  dev: {
    // set publicPath
    // assetPrefix: 'auto',
  },
  runtime: {
    router: true,
  },
  source: {
    // automatically generated asynchronous boundary via Dynamic Import, allowing the page code to consume remote modules generated by the module federation.
    enableAsyncEntry: false,
  },
  tools: {
    webpack: (config, { webpack, appendPlugins }) => {
      delete config.optimization.splitChunks;
      config.output.publicPath = 'auto';

      appendPlugins([
        new AsyncEntryStartupPlugin(),
        new ModuleFederationPlugin({
          name: 'app2',
          library: { type: 'window', name: 'app2' },
          runtime: false,
          filename: 'static/js/remoteEntry.js',
          exposes: {
            './Button': './src/components/button.js',
          },
          shared: {
            react: { singleton: true },
            'react-dom': { singleton: true },
          },
        }),
      ]);
    },
  },
  plugins: [appTools()],
});
