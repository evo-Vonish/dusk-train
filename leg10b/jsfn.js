// node jsfn.js file.js → 所有函数声明的 { 名字: [起, 止] }（字符位置），任意嵌套层级；同名的给出全部
const acorn = require('acorn'), fs = require('fs');
const js = fs.readFileSync(process.argv[2], 'utf8');
const ast = acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true });
const out = {};
(function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) { n.forEach(walk); return; }
  if (typeof n.type !== 'string') return;
  if (n.type === 'FunctionDeclaration' && n.id) (out[n.id.name] = out[n.id.name] || []).push([n.start, n.end]);
  for (const k in n) if (k !== 'type' && n[k] && typeof n[k] === 'object') walk(n[k]);
})(ast);
process.stdout.write(JSON.stringify(out));
