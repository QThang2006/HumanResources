// Restore missing OAuth callback templates from the exact installed npm release.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
async function main() {
  const runtime = process.env.N8N_LOCAL_RUNTIME || 'C:/Users/tienc/AppData/Local/Temp/hr-n8n-runtime-20261007';
  const target = path.join(runtime, 'node_modules/n8n');
  const pkg = JSON.parse(fs.readFileSync(path.join(target, 'package.json')));
  if (pkg.name !== 'n8n') throw Error('Unexpected package');
  const metadata = await fetch('https://registry.npmjs.org/n8n/' + pkg.version);
  if (!metadata.ok) throw Error('Cannot read npm release');
  const { dist } = await metadata.json();
  if (!dist.tarball.startsWith('https://registry.npmjs.org/')) throw Error('Unexpected package source');
  const download = await fetch(dist.tarball);
  if (!download.ok) throw Error('Cannot download npm release');
  const bytes = Buffer.from(await download.arrayBuffer());
  const [algorithm, expected] = dist.integrity.split('-');
  if (createHash(algorithm).update(bytes).digest('base64') !== expected) throw Error('npm integrity mismatch');
  const temp = path.resolve(__dirname, '../.temp/runtime-repair/n8n-' + pkg.version);
  fs.mkdirSync(temp, {recursive:true});
  fs.writeFileSync(path.join(temp,'package.tgz'), bytes);
  execFileSync('tar',['-xzf','package.tgz','package/templates'],{cwd:temp,windowsHide:true});
  const templates = path.join(target,'templates');
  fs.mkdirSync(templates,{recursive:true});
  let count = 0;
  function restore(source, destination) {
    for (const file of fs.readdirSync(source,{withFileTypes:true})) {
      const from=path.join(source,file.name), to=path.join(destination,file.name);
      if (file.isSymbolicLink()) throw Error('Unexpected template symlink');
      if (file.isDirectory()) { fs.mkdirSync(to,{recursive:true}); restore(from,to); }
      else if (file.isFile() && !fs.existsSync(to)) { fs.copyFileSync(from,to); count++; }
    }
  }
  restore(path.join(temp,'package/templates'),templates);
  console.log('Restored '+count+' missing templates from n8n@'+pkg.version);
}
main().catch(e=>{ console.error(e.message); process.exitCode=1; });
