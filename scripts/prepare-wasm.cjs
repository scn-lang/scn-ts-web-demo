const fs = require('fs/promises');
const path = require('path');
const { exec: execCallback } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const exec = promisify(execCallback);

const wasmFilesToCopy = {
  'web-tree-sitter': ['tree-sitter.wasm'],
  'tree-sitter-c': ['tree-sitter-c.wasm'],
  'tree-sitter-c-sharp': ['tree-sitter-c_sharp.wasm'],
  'tree-sitter-cpp': ['tree-sitter-cpp.wasm'],
  'tree-sitter-css': ['tree-sitter-css.wasm'],
  'tree-sitter-go': ['tree-sitter-go.wasm'],
  'tree-sitter-java': ['tree-sitter-java.wasm'],
  'tree-sitter-php': ['tree-sitter-php.wasm'],
  'tree-sitter-python': ['tree-sitter-python.wasm'],
  'tree-sitter-ruby': ['tree-sitter-ruby.wasm'],
  'tree-sitter-rust': ['tree-sitter-rust.wasm'],
  'tree-sitter-solidity': ['tree-sitter-solidity.wasm'],
  // 'tree-sitter-swift': ['tree-sitter-swift.wasm'], // WASM file not available in this package
  'tree-sitter-typescript': [
    'tree-sitter-typescript.wasm',
    'tree-sitter-tsx.wasm'
  ],
  // 'tree-sitter-vue': ['tree-sitter-vue.wasm'], // WASM file not available in this package
};

// We don't want to list web-tree-sitter here because it's a real dependency
// and we'll get its wasm file via require.resolve.
const treeSitterGrammars = {
  "tree-sitter-c": "^0.24.1",
  "tree-sitter-c-sharp": "^0.23.1",
  "tree-sitter-cpp": "^0.23.4",
  "tree-sitter-css": "^0.23.2",
  "tree-sitter-go": "^0.23.4",
  "tree-sitter-java": "^0.23.5",
  "tree-sitter-php": "^0.23.12",
  "tree-sitter-python": "^0.23.6",
  "tree-sitter-ruby": "^0.23.1",
  "tree-sitter-rust": "^0.24.0",
  "tree-sitter-solidity": "^1.2.11",
  "tree-sitter-typescript": "^0.23.2",
};

async function runCommand(command, options) {
  console.log(`> ${command}`);
  try {
    const { stdout, stderr } = await exec(command, options);
    // Many commands log status to stderr, so we show it but don't treat as an error unless exec throws.
    if (stderr) console.log(stderr.trim());
    return stdout.trim();
  } catch (error) {
    console.error(`\n[ERROR] Command failed: ${command}`);
    if (error.stdout) console.error('STDOUT:', error.stdout);
    if (error.stderr) console.error('STDERR:', error.stderr);
    throw error;
  }
}

async function prepareWasm() {
  const publicWasmDir = path.resolve(process.cwd(), 'public/wasm');
  console.log(`Ensuring public/wasm directory exists at: ${publicWasmDir}`);
  await fs.mkdir(publicWasmDir, { recursive: true });

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repograph-wasm-'));
  console.log(`Created temporary directory: ${tempDir}`);

  try {
    // --- Step 1: Copy from direct dependencies ---
    console.log('\nCopying WASM from direct dependencies...');
    const webTreeSitterWasm = wasmFilesToCopy['web-tree-sitter'];
    if (webTreeSitterWasm) {
      for (const wasmFileName of webTreeSitterWasm) {
        try {
          const sourcePath = require.resolve(`web-tree-sitter/${wasmFileName}`);
          const destPath = path.join(publicWasmDir, wasmFileName);
          await fs.copyFile(sourcePath, destPath);
          console.log(`Copied ${wasmFileName} from web-tree-sitter to public/wasm/`);
        } catch (error) {
           console.error(`\n[ERROR] Could not copy ${wasmFileName} from web-tree-sitter.`);
           console.error(error.message);
        }
      }
    }

    // --- Step 2: Fetch and extract from temporary grammar packages ---
    console.log('\nFetching and extracting WASM from grammar packages...');
    const grammarPackages = Object.entries(treeSitterGrammars);

    for (const [packageName, version] of grammarPackages) {
      const packageSpec = `${packageName}@${version}`;
      const wasmFileNames = wasmFilesToCopy[packageName];

      if (!wasmFileNames) {
        console.warn(`[WARN] No WASM files configured for ${packageName}, skipping.`);
        continue;
      }
      
      console.log(`\nProcessing ${packageSpec}...`);
      try {
        // `npm pack` downloads a tarball and prints its name to stdout. --silent reduces verbosity.
        const tarballName = await runCommand(`npm pack ${packageSpec} --silent`, { cwd: tempDir });
        const tarballPath = path.join(tempDir, tarballName);
        
        // Extract the tarball. The contents will be in a 'package' directory.
        await runCommand(`tar -xzf "${tarballPath}" -C "${tempDir}"`);

        for (const wasmFileName of wasmFileNames) {
          const sourcePath = path.join(tempDir, 'package', wasmFileName);
          const destPath = path.join(publicWasmDir, wasmFileName);
          await fs.copyFile(sourcePath, destPath);
          console.log(`Copied ${wasmFileName} to public/wasm/`);
        }
      } catch (error) {
        console.error(`\n[ERROR] Failed to process ${packageSpec}.`);
        // Continue to the next package
      }
    }
  } finally {
    // --- Step 3: Cleanup temp dir ---
    console.log(`\nCleaning up temporary directory: ${tempDir}`);
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  // --- Step 4: Clean up dependencies from package.json by direct file modification ---
  console.log('\nChecking for temporary grammar dependencies to remove from package.json...');
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);

    const depsToRemove = Object.keys(treeSitterGrammars).filter(
      (pkg) => packageJson.dependencies && packageJson.dependencies[pkg]
    );

    if (depsToRemove.length > 0) {
      console.log(`Found and will remove temporary dependencies: ${depsToRemove.join(', ')}`);
      
      for (const pkg of depsToRemove) {
        delete packageJson.dependencies[pkg];
      }

      const newPackageJsonContent = JSON.stringify(packageJson, null, 2) + '\n';
      await fs.writeFile(packageJsonPath, newPackageJsonContent, 'utf8');
      console.log('✅ package.json has been rewritten. The slow package manager interaction is no longer needed.');
      console.log('The temporary packages will be removed from node_modules on the next `bun install`.');
    } else {
      console.log('No temporary grammar dependencies found in package.json. Nothing to do.');
    }
  } catch (error) {
    console.error(`\n[ERROR] Could not read or modify package.json at ${packageJsonPath}`);
    console.error(error.message);
    // Don't rethrow, as the main goal (copying wasm) was successful.
  }

  console.log('\n✅ WASM file preparation complete.');
}

prepareWasm().catch(err => {
  console.error('\n[FATAL] Failed to prepare WASM files.', err);
  process.exit(1);
});