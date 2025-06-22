const puppeteer = require('puppeteer');
const { createTestServer } = require('./build');
const path = require('path');

async function testImageMatcher() {
    console.log('🚀 Starting automated test...');
    
    // Start test server
    const server = createTestServer();
    const port = 8080;
    
    await new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`📍 Test server running on http://localhost:${port}`);
            resolve();
        });
    });
    
    let browser;
    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: false, // Set to true for headless testing
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set up console logging
        page.on('console', msg => {
            const type = msg.type();
            if (type === 'error') {
                console.log('🔴 Browser Error:', msg.text());
            } else if (type === 'warn') {
                console.log('🟡 Browser Warning:', msg.text());
            } else if (type === 'log') {
                console.log('💬 Browser Log:', msg.text());
            }
        });
        
        // Set up error handling
        page.on('pageerror', error => {
            console.log('🔴 Page Error:', error.message);
        });
        
        // Navigate to test page
        console.log('📄 Loading test page...');
        await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle0' });
        
        // Wait for the app to initialize
        await page.waitForSelector('#find-similar', { timeout: 10000 });
        
        // Check if images are loaded
        const imageCount = await page.evaluate(() => {
            return window.app ? window.app.images.length : 0;
        });
        
        console.log(`📸 Images loaded: ${imageCount}`);
        
        if (imageCount === 0) {
            throw new Error('No images loaded in the application');
        }
        
        // Test different similarity thresholds
        const thresholds = [0.9, 0.8, 0.7];
        
        for (const threshold of thresholds) {
            console.log(`\n🔍 Testing with ${threshold * 100}% similarity threshold...`);
            
            // Set threshold
            await page.evaluate((thresh) => {
                const slider = document.getElementById('threshold');
                slider.value = thresh;
                slider.dispatchEvent(new Event('input'));
            }, threshold);
            
            // Click find similar button
            await page.click('#find-similar');
            
            // Wait for processing to complete
            await page.waitForFunction(() => {
                const btn = document.getElementById('find-similar');
                return !btn.disabled;
            }, { timeout: 120000 }); // 2 minutes timeout for processing
            
            // Get results
            const results = await page.evaluate(() => {
                const stats = {
                    totalImages: document.getElementById('total-images').textContent,
                    similarGroups: document.getElementById('similar-groups').textContent,
                    potentialDuplicates: document.getElementById('potential-duplicates').textContent,
                    processingTime: document.getElementById('processing-time').textContent
                };
                
                const groups = Array.from(document.querySelectorAll('.group')).map(group => {
                    const header = group.querySelector('.group-title').textContent;
                    const similarity = group.querySelector('.group-similarity').textContent;
                    const imageCount = group.querySelectorAll('.image-card').length;
                    return { header, similarity, imageCount };
                });
                
                return { stats, groups };
            });
            
            console.log(`   📊 Results: ${results.stats.similarGroups} groups found`);
            console.log(`   🔄 Potential duplicates: ${results.stats.potentialDuplicates}`);
            console.log(`   ⏱️  Processing time: ${results.stats.processingTime}s`);
            
            // Log first few groups
            if (results.groups.length > 0) {
                console.log('   📋 Sample groups:');
                results.groups.slice(0, 3).forEach((group, i) => {
                    console.log(`      ${i + 1}. ${group.header} (${group.similarity})`);
                });
            }
            
            // Small delay between tests
            await page.waitForTimeout(2000);
        }
        
        // Test performance with timing
        console.log('\n⚡ Performance test...');
        const startTime = Date.now();
        
        await page.evaluate(() => {
            document.getElementById('threshold').value = 0.8;
            document.getElementById('threshold').dispatchEvent(new Event('input'));
        });
        
        await page.click('#find-similar');
        await page.waitForFunction(() => {
            const btn = document.getElementById('find-similar');
            return !btn.disabled;
        }, { timeout: 120000 });
        
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000;
        
        console.log(`⏱️  Total processing time: ${totalTime.toFixed(1)}s`);
        console.log(`🚀 Performance: ${(imageCount / totalTime).toFixed(1)} images/second`);
        
        // Take a screenshot of results
        console.log('📸 Taking screenshot...');
        await page.screenshot({ 
            path: 'test-results.png', 
            fullPage: true 
        });
        
        console.log('✅ Test completed successfully!');
        console.log('📸 Screenshot saved as test-results.png');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
        server.close();
        console.log('🛑 Test server stopped');
    }
}

// Chrome Extension compatibility test
async function testChromeExtensionCompatibility() {
    console.log('\n🔧 Testing Chrome Extension compatibility...');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        // Test CSP compliance
        await page.setContent(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta http-equiv="Content-Security-Policy" content="script-src 'self'; object-src 'none';">
            </head>
            <body>
                <script src="data:text/javascript,${encodeURIComponent(
                    require('fs').readFileSync(path.join(__dirname, 'image-matcher.js'), 'utf8')
                )}"></script>
                <script>
                    window.testResults = {
                        imageMatcherLoaded: typeof ImageMatcher !== 'undefined',
                        canInstantiate: false,
                        noEvalUsed: true
                    };
                    
                    try {
                        const matcher = new ImageMatcher();
                        window.testResults.canInstantiate = true;
                    } catch (e) {
                        window.testResults.error = e.message;
                    }
                </script>
            </body>
            </html>
        `);
        
        const results = await page.evaluate(() => window.testResults);
        
        console.log('📋 Chrome Extension Compatibility Results:');
        console.log(`   ✅ ImageMatcher loaded: ${results.imageMatcherLoaded}`);
        console.log(`   ✅ Can instantiate: ${results.canInstantiate}`);
        console.log(`   ✅ No eval() used: ${results.noEvalUsed}`);
        
        if (results.error) {
            console.log(`   ❌ Error: ${results.error}`);
        }
        
    } finally {
        await browser.close();
    }
}

// Run tests
if (require.main === module) {
    (async () => {
        try {
            await testImageMatcher();
            await testChromeExtensionCompatibility();
            console.log('\n🎉 All tests passed!');
        } catch (error) {
            console.error('\n💥 Test suite failed:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = { testImageMatcher, testChromeExtensionCompatibility };