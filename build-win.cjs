const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('[Build Script] Cleaning dist-electron...');
  try { fs.rmSync(path.join(__dirname, 'dist-electron'), { recursive: true, force: true }); } catch(e) {}

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      console.log(`[Build Script] Running electron-builder (Attempt ${attempts})...`);
      execSync('npx electron-builder --win', { stdio: 'inherit' });
      console.log('[Build Script] Build succeeded!');
      return;
    } catch (err) {
      console.log('[Build Script] Handled build error. Checking dist-electron status...');
      const tmpDir = path.join(__dirname, 'dist-electron/win-unpacked.tmp');
      const targetDir = path.join(__dirname, 'dist-electron/win-unpacked');

      if (fs.existsSync(tmpDir) && !fs.existsSync(targetDir)) {
        console.log('[Build Script] Resolving Windows lock by renaming win-unpacked.tmp -> win-unpacked...');
        for (let i = 0; i < 5; i++) {
          try {
            fs.renameSync(tmpDir, targetDir);
            console.log('[Build Script] Renamed win-unpacked.tmp -> win-unpacked!');
            break;
          } catch (e) {
            await new Promise(res => setTimeout(res, 1000));
          }
        }
      }

      if (fs.existsSync(targetDir)) {
        try {
          console.log('[Build Script] Packaging prepackaged target...');
          execSync('npx electron-builder --win --prepackaged dist-electron/win-unpacked', { stdio: 'inherit' });
          console.log('[Build Script] Prepackaged build succeeded!');
          return;
        } catch (preErr) {
          console.log('[Build Script] Prepackaged build retry failed, clearing cache...');
          const cacheDir = path.join(process.env.LOCALAPPDATA || '', 'electron-builder/Cache');
          try { fs.rmSync(cacheDir, { recursive: true, force: true }); } catch(e) {}
        }
      }
    }
  }
}

main().catch(err => {
  console.error('[Build Script Failed]:', err);
  process.exit(1);
});
