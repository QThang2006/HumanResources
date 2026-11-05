// Restore missing files only, from the exact installed package versions on npm.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const runtime = process.env.N8N_TEST_RUNTIME || 'C:/Users/tienc/AppData/Local/Temp/hr-n8n-runtime-20261007/node_modules';
const target = path.join(runtime, process.argv[2] || 'html-to-text');
const destRoot = fs.realpathSync(runtime);
async function main() {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      execFileSync(process.execPath, ['-e', 'require(' + JSON.stringify(target) + ')'], { stdio: 'pipe', windowsHide: true });
      console.log('Mail renderer dependencies available.'); return;
    } catch (e) {
      const match = String(e.stderr).match(/Cannot find module '([^']+)'/);
      if (!match || !path.isAbsolute(match[1])) throw e;
      let folder = path.dirname(match[1]);
      while (!fs.existsSync(path.join(folder, 'package.json')) && folder !== path.dirname(folder)) folder = path.dirname(folder);
      while (!JSON.parse(fs.readFileSync(path.join(folder, 'package.json'))).name) {
        folder = path.dirname(folder);
        while (!fs.existsSync(path.join(folder, 'package.json')) && folder !== path.dirname(folder)) folder = path.dirname(folder);
      }
      const resolved = fs.realpathSync(folder);
      if (!resolved.startsWith(destRoot + path.sep)) throw Error('Refuse path outside n8n runtime');
      const pkg = JSON.parse(fs.readFileSync(path.join(folder, 'package.json')));
      const meta = await (await fetch('https://registry.npmjs.org/' + pkg.name + '/' + pkg.version)).json();
      if (!meta.dist?.tarball?.startsWith('https://registry.npmjs.org/')) throw Error('Unexpected package source');
      const tmp = path.join(__dirname, '../.temp/runtime-repair', pkg.name.replaceAll('/', '_') + '-' + pkg.version);
      fs.mkdirSync(tmp, { recursive: true });
      const data = Buffer.from(await (await fetch(meta.dist.tarball)).arrayBuffer());
      const { createHash } = require('node:crypto');
      const [algorithm, expected] = meta.dist.integrity.split('-');
      if (createHash(algorithm).update(data).digest('base64') !== expected) throw Error('npm integrity mismatch');
      fs.writeFileSync(path.join(tmp, 'package.tgz'), data);
      execFileSync('tar', ['-xzf', 'package.tgz'], { cwd: tmp, windowsHide: true });
      function restore(source, destination) {
        for (const item of fs.readdirSync(source, { withFileTypes: true })) {
          if (item.isSymbolicLink()) throw Error('Unexpected package symlink');
          const to = path.join(destination, item.name), from = path.join(source, item.name);
          if (item.isDirectory()) { fs.mkdirSync(to, {recursive:true}); restore(from,to); }
          else if (!fs.existsSync(to)) fs.copyFileSync(from,to);
        }
      }
      restore(path.join(tmp, 'package'), folder);
      console.log('Restored missing files: ' + pkg.name + '@' + pkg.version);
    }
  }
  throw Error('Repair limit reached');
}
main().catch(e=>{ console.error(e.message); process.exitCode=1; });
