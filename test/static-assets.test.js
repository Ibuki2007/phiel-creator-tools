import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('CSSはHTMLから読み込み、JavaScriptからはimportしない', async () => {
  const [html, main] = await Promise.all([
    readFile('index.html', 'utf8'),
    readFile('src/main.js', 'utf8')
  ]);

  assert.match(html, /<link rel="stylesheet" href="\.\/src\/style\.css"\s*\/?>/);
  assert.match(html, /<script type="module" src="\.\/src\/main\.js"><\/script>/);
  assert.doesNotMatch(main, /import\s+['"]\.\/style\.css['"]/);
});

test('GitHub Pagesのサブパスから静的アセットを解決できる', () => {
  const page = new URL('https://example.github.io/phiel-creator-tools/');

  assert.equal(new URL('./src/main.js', page).pathname, '/phiel-creator-tools/src/main.js');
  assert.equal(new URL('./src/style.css', page).pathname, '/phiel-creator-tools/src/style.css');
});

test('ビルド成果物にもHTML、JavaScript、CSSの修正が反映される', async () => {
  await execFileAsync(process.execPath, ['scripts/build.js']);
  const [html, main, css] = await Promise.all([
    readFile('dist/index.html', 'utf8'),
    readFile('dist/src/main.js', 'utf8'),
    readFile('dist/src/style.css', 'utf8')
  ]);

  assert.match(html, /href="\.\/src\/style\.css"/);
  assert.doesNotMatch(main, /import\s+['"]\.\/style\.css['"]/);
  assert.match(css, /:root\s*\{/);
});
