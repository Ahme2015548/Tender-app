(async () => {
  console.log("Running Vite build with Vercel chunk repair...");
  console.log("Node version:", process.version);
  
  // Check and repair Vite chunks
  const fs = require('fs');
  const path = require('path');
  const { execSync } = require('child_process');
  
  const viteChunksPath = 'node_modules/vite/dist/node/chunks';
  const viteNodePath = 'node_modules/vite/dist/node';
  
  // Check if this is Vercel - use Webpack immediately if on Vercel
  const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
  
  if (isVercel) {
    console.log("🚨 Vercel environment detected - using Webpack build to avoid Vite chunks issue!");
    
    // 🧠 SENIOR REACT: Temporarily modify package.json to remove "type": "module" for webpack compatibility
    console.log("📝 Temporarily modifying package.json for webpack compatibility...");
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const originalType = packageJson.type;
    
    try {
      console.log("🔧 Building with Webpack + Babel (bypassing Vite completely)...");
      delete packageJson.type; // Remove "type": "module" temporarily
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      
      // Install webpack and babel for alternative build
      console.log("📦 Installing webpack dependencies...");
      execSync('npm install --no-save webpack@5 webpack-cli@5 babel-loader@9 @babel/core@7 @babel/preset-react@7 @babel/preset-env@7 css-loader@6 style-loader@3 sass-loader@13 sass@1 html-webpack-plugin@5 copy-webpack-plugin@11', { stdio: 'inherit', timeout: 180000 });
      console.log("✅ Webpack dependencies installed successfully");
      
      // Create webpack config for emergency build (CommonJS format after removing type: module)
      const webpackConfig = `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/main.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/index-[contenthash].js',
    clean: true,
    publicPath: '/'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fullySpecified: false,
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react', '@babel/preset-env']
          }
        }
      },
      {
        test: /\\.(css|scss)$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                includePaths: ['./src/assets/css']
              }
            }
          }
        ]
      },
      {
        test: /\\.(png|jpg|jpeg|gif|svg|woff|woff2|eot|ttf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      inject: true
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.', noErrorOnMissing: true },
        { from: 'src/assets/images', to: 'images', noErrorOnMissing: true }
      ]
    })
  ]
};`;
      
      fs.writeFileSync('webpack.config.js', webpackConfig);
      
      // Run webpack build
      execSync('npx webpack --config webpack.config.js', { stdio: 'inherit', timeout: 300000 });
      
      // 🧠 SENIOR REACT: Restore original package.json
      console.log("📝 Restoring original package.json...");
      if (originalType) {
        packageJson.type = originalType;
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      }
      
      console.log("✅ Webpack build completed successfully!");
      process.exit(0);
      
    } catch (webpackErr) {
      console.log("❌ Webpack build failed:", webpackErr?.message);
      
      // 🧠 SENIOR REACT: Restore package.json even on failure
      try {
        console.log("📝 Restoring original package.json after failure...");
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        if (originalType && !packageJson.type) {
          packageJson.type = originalType;
          fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        }
      } catch (restoreErr) {
        console.error("⚠️ Could not restore package.json:", restoreErr.message);
      }
      
      // 🧠 SENIOR REACT: On Vercel, if webpack fails, force exit with error
      // Don't fall through to broken Vite chunks
      if (isVercel) {
        console.error("🔥 VERCEL BUILD FAILED: Webpack is the only reliable option on Vercel due to Vite chunks issue");
        console.error("💡 This is expected - the chunks issue requires webpack fallback");
        console.error("📋 Error details for debugging:");
        console.error(webpackErr);
        process.exit(1);
      }
      // Continue to try Vite methods only if NOT on Vercel
    }
  }
  
  console.log("🔍 Checking Vite installation integrity...");
  const chunksExist = fs.existsSync(viteChunksPath);
  
  if (chunksExist) {
    console.log("✅ Vite chunks directory exists");
  } else {
    console.log("⚠️ Vite chunks directory missing");
  }
  
  // Method 1: Direct Vite command first
  try {
    console.log("🚀 Attempting direct Vite build command...");
    execSync('node ./node_modules/vite/bin/vite.js build', { stdio: 'inherit' });
    console.log("✅ Direct Vite build completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Direct build failed:", err?.message || err);
  }

  // Method 2: Try programmatic API
  try {
    console.log("🚀 Attempting programmatic Vite build...");
    const { build } = await import('vite');
    await build({
      configFile: path.resolve(process.cwd(), 'vite.config.mjs'),
      build: {
        outDir: 'dist',
        emptyOutDir: true
      }
    });
    console.log("✅ Programmatic Vite build completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Programmatic build failed:", err?.message || err);
  }
  
  // Method 3: Try manual Rollup build (bypass Vite chunks)
  try {
    console.log("🔨 Attempting manual Rollup build (bypass chunks)...");
    const rollup = require('rollup');
    const { nodeResolve } = require('@rollup/plugin-node-resolve');
    
    // Simple manual build without Vite's internal chunks
    const inputOptions = {
      input: 'src/main.jsx',
      plugins: [
        nodeResolve({ preferBuiltins: false }),
        {
          name: 'jsx-transform',
          transform(code, id) {
            if (id.endsWith('.jsx') || id.endsWith('.js')) {
              // Very basic JSX transform for emergency fallback
              return code.replace(/import\s+React/g, 'const React = window.React');
            }
            return null;
          }
        }
      ]
    };
    
    console.log("⚠️ Manual build too complex, trying system approach...");
  } catch (rollupErr) {
    console.log("❌ Manual build not viable:", rollupErr?.message);
  }
  
  // If all methods fail, exit with error
  console.error("🔥 All build methods failed");
  console.error("❌ Could not build application");
  process.exit(1);
})();