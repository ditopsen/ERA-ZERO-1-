// Script to inline all JS and CSS into a single self-contained index.html
// Uses base64 encoding for JS with proper UTF-8 handling
// Run with: bun run inline-build.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, 'dist');
const htmlPath = path.join(distDir, 'index.html');
const assetsDir = path.join(distDir, 'assets');

// Always rebuild first to get a clean dist
console.log('🔨 Compilando el juego...');
execSync(`"${path.join(process.env.USERPROFILE || '', '.bun', 'bin', 'bun.exe')}" run build`, { 
  cwd: __dirname, 
  stdio: 'inherit' 
});

// Re-read the freshly built HTML
let html = fs.readFileSync(htmlPath, 'utf-8');

// Find CSS and JS filenames
const cssLinkRegex = /<link rel="stylesheet"[^>]*href="\.\/assets\/([\w\-.]+\.css)"[^>]*>/;
const jsScriptRegex = /<script type="module"[^>]*src="\.\/assets\/([\w\-.]+\.js)"[^>]*><\/script>/;

const cssMatch = html.match(cssLinkRegex);
const jsMatch = html.match(jsScriptRegex);

// Inline CSS directly (safe — no tag-breaking issues)
if (cssMatch) {
  const cssFile = path.join(assetsDir, cssMatch[1]);
  const cssContent = fs.readFileSync(cssFile, 'utf-8');
  html = html.replace(cssLinkRegex, `<style>${cssContent}</style>`);
  console.log(`✅ CSS inlined: ${cssMatch[1]} (${(cssContent.length / 1024).toFixed(1)} KB)`);
}

// Inline JS using base64 with proper UTF-8 byte handling
if (jsMatch) {
  const jsFile = path.join(assetsDir, jsMatch[1]);
  const jsBuffer = fs.readFileSync(jsFile); // Read as raw Buffer (bytes)
  const jsBase64 = jsBuffer.toString('base64');
  
  // Loader that properly decodes UTF-8 from base64:
  // 1. atob() gives us Latin-1 chars (raw bytes as chars)
  // 2. Convert to Uint8Array to get actual bytes
  // 3. Create Blob from bytes (preserving UTF-8)
  // 4. Execute via URL.createObjectURL
  const loaderScript = `<script>
(function(){
  var b64="${jsBase64}";
  var raw=atob(b64);
  var bytes=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
  var blob=new Blob([bytes],{type:"text/javascript;charset=utf-8"});
  var url=URL.createObjectURL(blob);
  var s=document.createElement("script");
  s.src=url;
  document.head.appendChild(s);
})();
</script>`;

  html = html.replace(jsScriptRegex, loaderScript);
  console.log(`✅ JS inlined (base64 UTF-8): ${jsMatch[1]} (${(jsBase64.length / 1024).toFixed(1)} KB encoded)`);
}

// Write final self-contained HTML
fs.writeFileSync(htmlPath, html, 'utf-8');

// Also copy to root as the portable game file
const rootGamePath = path.join(__dirname, 'JUEGO-INK-BATTLE-3D.html');
fs.copyFileSync(htmlPath, rootGamePath);

const finalSize = fs.statSync(rootGamePath).size;
console.log(`\n🎮 Archivo final: JUEGO-INK-BATTLE-3D.html (${(finalSize / 1024).toFixed(0)} KB)`);
console.log('👉 ¡Haz doble clic en JUEGO-INK-BATTLE-3D.html para jugar!');
