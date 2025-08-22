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
    
    try {
      console.log("🔧 Building with Webpack + Babel (bypassing Vite completely)...");
      
      // Install webpack and babel for alternative build
      execSync('npm install --no-save webpack webpack-cli babel-loader @babel/core @babel/preset-react @babel/preset-env css-loader style-loader sass-loader html-webpack-plugin copy-webpack-plugin', { stdio: 'inherit', timeout: 120000 });
      
      // Create webpack config for emergency build
      const webpackConfig = `
const path = require('path');
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
    extensions: ['.js', '.jsx']
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
        use: ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\\.(png|jpg|jpeg|gif|svg|woff|woff2|eot|ttf)$/,
        type: 'asset/resource'
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
        { from: 'public', to: '.', noErrorOnMissing: true }
      ]
    })
  ]
};`;
      
      fs.writeFileSync('webpack.config.js', webpackConfig);
      
      // Run webpack build
      execSync('npx webpack --config webpack.config.js', { stdio: 'inherit', timeout: 300000 });
      
      console.log("✅ Webpack build completed successfully!");
      process.exit(0);
      
    } catch (webpackErr) {
      console.log("❌ Webpack build failed:", webpackErr?.message);
      // Continue to try Vite methods as last resort
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