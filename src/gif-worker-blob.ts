// Importing .js file automatically adds `import "core-js/..."`
// @ts-ignore
import script from 'raw-loader!./gif.worker.js.txt';

export default new Blob([script], {
  type: 'application/javascript',
});
