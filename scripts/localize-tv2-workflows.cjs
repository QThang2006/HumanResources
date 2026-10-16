// Run after export:workflow --all. Rewrites display names and their references together.
const fs=require('node:fs');
const path=require('node:path');
const {workflowNames,replaceNames,renameWorkflow}=require('./workflow-vietnamese-names.cjs');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'.temp/tv2-local-import');
const previous=JSON.parse(fs.readFileSync(path.join(dir,'before-vietnamese-names.json'),'utf8'));
const titles=previous.filter(w=>workflowNames[w.id]).map(w=>[w.name,workflowNames[w.id]]).sort((a,b)=>b[0].length-a[0].length);
if(process.argv.includes('--sources')) {
  const files=[...fs.readdirSync(__dirname).filter(f=>/\.(cjs|ps1)$/.test(f)).map(f=>path.join(__dirname,f)),
    ...fs.readdirSync(path.join(root,'backend/test')).filter(f=>f.endsWith('.cjs')).map(f=>path.join(root,'backend/test',f)),
    ...fs.readdirSync(path.join(root,'workflows')).filter(f=>f.endsWith('.json')).map(f=>path.join(root,'workflows',f))];
  for(const file of files) {
    if(['workflow-vietnamese-names.cjs','localize-tv2-workflows.cjs'].includes(path.basename(file))) continue;
    const before=fs.readFileSync(file,'utf8');let after=replaceNames(before);
    for(const [oldName,newName] of titles) after=after.split(oldName).join(newName);
    if(after!==before){fs.writeFileSync(file,after);console.log('Updated source: '+path.relative(root,file));}
  }
}
const renamed=previous.filter(w=>workflowNames[w.id]).map(w=>({...renameWorkflow(w),active:false}));
fs.writeFileSync(path.join(dir,'vietnamese-display-names.json'),JSON.stringify(renamed,null,2));
console.log(JSON.stringify(renamed.map(w=>({id:w.id,name:w.name,nodes:w.nodes.length})),null,2));
console.log('Active workflows: apply changes in the editor and Publish. Do not bulk-import them: the CLI import deactivates workflows.');
