#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Build script to generate HTML page with embedded image list
 */
function generateImageList() {
    const imagesDir = path.join(__dirname, 'images');
    const htmlTemplate = path.join(__dirname, 'index.html');
    const outputFile = path.join(__dirname, 'test.html');
    
    console.log('🔍 Scanning images directory...');
    
    if (!fs.existsSync(imagesDir)) {
        console.error('❌ Images directory not found!');
        process.exit(1);
    }
    
    // Get all image files
    const imageFiles = fs.readdirSync(imagesDir)
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .sort();
    
    console.log(`📸 Found ${imageFiles.length} images`);
    
    if (imageFiles.length === 0) {
        console.error('❌ No image files found in images directory!');
        process.exit(1);
    }
    
    // Generate image list with relative paths
    const imageList = imageFiles.map((file, index) => ({
        id: `images/${file}`,
        src: `images/${file}`,
        name: file,
        index: index
    }));
    
    console.log('📝 Reading HTML template...');
    
    if (!fs.existsSync(htmlTemplate)) {
        console.error('❌ HTML template (index.html) not found!');
        process.exit(1);
    }
    
    let htmlContent = fs.readFileSync(htmlTemplate, 'utf8');
    
    // Replace the placeholder with actual image data
    const imageListJs = `const GENERATED_IMAGE_LIST = ${JSON.stringify(imageList, null, 4)};`;
    htmlContent = htmlContent.replace('const GENERATED_IMAGE_LIST = [];', imageListJs);
    
    // Add build timestamp
    const buildInfo = `
    <!-- Generated on ${new Date().toISOString()} -->
    <!-- Images found: ${imageFiles.length} -->
    `;
    htmlContent = htmlContent.replace('</head>', `    ${buildInfo}</head>`);
    
    console.log('💾 Writing output file...');
    fs.writeFileSync(outputFile, htmlContent);
    
    console.log('✅ Build completed successfully!');
    console.log(`📄 Output: ${outputFile}`);
    console.log(`🖼️  Images included: ${imageFiles.length}`);
    console.log('');
    console.log('🚀 To test:');
    console.log(`   Open: file://${outputFile}`);
    console.log('   Or run a local server in this directory');
    
    return {
        outputFile,
        imageCount: imageFiles.length,
        images: imageList
    };
}

// Also create a simple HTTP server for testing
function createTestServer() {
    const http = require('http');
    const url = require('url');
    const mime = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    };
    
    const server = http.createServer((req, res) => {
        const pathname = url.parse(req.url).pathname;
        let filePath = pathname === '/' ? '/test.html' : pathname;
        filePath = path.join(__dirname, filePath);
        
        // Security check
        if (!filePath.startsWith(__dirname)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            
            const ext = path.extname(filePath);
            const contentType = mime[ext] || 'application/octet-stream';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
    
    return server;
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
📸 Image Similarity Test Builder

Usage:
  node build.js [options]

Options:
  --serve, -s     Start a local test server after building
  --port, -p      Server port (default: 8080)
  --help, -h      Show this help

Examples:
  node build.js              # Build test.html
  node build.js --serve      # Build and serve on http://localhost:8080
  node build.js -s -p 3000   # Build and serve on port 3000
`);
        process.exit(0);
    }
    
    try {
        const result = generateImageList();
        
        if (args.includes('--serve') || args.includes('-s')) {
            const portIndex = Math.max(args.indexOf('--port'), args.indexOf('-p'));
            const port = portIndex >= 0 && args[portIndex + 1] ? parseInt(args[portIndex + 1]) : 8080;
            
            const server = createTestServer();
            server.listen(port, () => {
                console.log('');
                console.log('🌐 Test server started!');
                console.log(`📍 Open: http://localhost:${port}`);
                console.log('   Press Ctrl+C to stop');
            });
            
            process.on('SIGINT', () => {
                console.log('\n👋 Stopping server...');
                server.close(() => {
                    console.log('✅ Server stopped');
                    process.exit(0);
                });
            });
        }
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

module.exports = { generateImageList, createTestServer };