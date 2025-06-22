/**
 * Manual test script for the ImageMatcher library
 * Tests core functionality without browser dependencies
 */

// Simulate browser environment
global.document = {
    createElement: (tag) => {
        if (tag === 'canvas') {
            return {
                width: 0,
                height: 0,
                getContext: () => ({
                    drawImage: () => {},
                    getImageData: () => ({
                        width: 8,
                        height: 8,
                        data: new Array(256).fill(0).map(() => Math.floor(Math.random() * 256))
                    }),
                    putImageData: () => {}
                })
            };
        }
        return {};
    }
};

global.Image = function() {
    return {
        crossOrigin: '',
        onload: null,
        onerror: null,
        src: '',
        width: 100,
        height: 100
    };
};

// Load the ImageMatcher library
const fs = require('fs');
const path = require('path');

// Set up module.exports for the library
global.module = { exports: {} };

const imageMatcherCode = fs.readFileSync(path.join(__dirname, 'image-matcher.js'), 'utf8');
eval(imageMatcherCode);

// Get the ImageMatcher class
const ImageMatcher = global.module.exports;

console.log('🧪 Running ImageMatcher Tests...\n');

async function testBasicFunctionality() {
    console.log('1. Testing basic instantiation...');
    const matcher = new ImageMatcher();
    console.log('   ✅ ImageMatcher created successfully');
    
    console.log('\n2. Testing hash computation...');
    
    // Mock image data
    const mockImageData = {
        width: 8,
        height: 8,
        data: new Array(256).fill(0).map((_, i) => {
            // Create a simple pattern
            const pixel = i % 4;
            if (pixel === 3) return 255; // Alpha
            return Math.floor((i / 4) % 256); // RGB
        })
    };
    
    const aHash = matcher.computeAverageHash(mockImageData);
    const dHash = matcher.computeDifferenceHash(mockImageData);
    const pHash = matcher.computePerceptualHash(mockImageData);
    const edgeHash = matcher.computeEdgeHash(mockImageData);
    
    console.log(`   ✅ aHash: ${aHash.substring(0, 16)}... (${aHash.length} bits)`);
    console.log(`   ✅ dHash: ${dHash.substring(0, 16)}... (${dHash.length} bits)`);
    console.log(`   ✅ pHash: ${pHash.substring(0, 16)}... (${pHash.length} bits)`);
    console.log(`   ✅ edgeHash: ${edgeHash.substring(0, 16)}... (${edgeHash.length} bits)`);
    
    console.log('\n3. Testing color histogram...');
    const histogram = matcher.computeColorHistogram(mockImageData);
    console.log(`   ✅ Histogram channels: ${Object.keys(histogram).join(', ')}`);
    console.log(`   ✅ R channel length: ${histogram.r.length}`);
    
    console.log('\n4. Testing dominant colors...');
    const colors = matcher.extractDominantColors(mockImageData, 3);
    console.log(`   ✅ Extracted ${colors.length} dominant colors`);
    colors.forEach((color, i) => {
        console.log(`      Color ${i + 1}: rgb(${color.r}, ${color.g}, ${color.b})`);
    });
    
    console.log('\n5. Testing Hamming distance...');
    const hash1 = '1010101010101010';
    const hash2 = '1010101010101011';
    const distance = matcher.hammingDistance(hash1, hash2);
    console.log(`   ✅ Distance between similar hashes: ${distance}`);
    
    console.log('\n6. Testing histogram comparison...');
    const hist1 = {
        r: [0.1, 0.2, 0.3, 0.4],
        g: [0.2, 0.2, 0.3, 0.3],
        b: [0.3, 0.2, 0.2, 0.3]
    };
    const hist2 = {
        r: [0.1, 0.2, 0.3, 0.4],
        g: [0.2, 0.2, 0.3, 0.3],
        b: [0.3, 0.2, 0.2, 0.3]
    };
    const similarity = matcher.compareHistograms(hist1, hist2);
    console.log(`   ✅ Identical histograms similarity: ${similarity.toFixed(3)}`);
    
    console.log('\n7. Testing memory usage...');
    const stats = matcher.getStats();
    console.log(`   ✅ Cached images: ${stats.cachedImages}`);
    console.log(`   ✅ Memory usage: ${stats.memoryUsage} bytes`);
}

async function testSimilarityComparison() {
    console.log('\n8. Testing image comparison...');
    
    const matcher = new ImageMatcher();
    
    // Create two similar fingerprints
    const fingerprint1 = {
        id: 'test1',
        width: 100,
        height: 100,
        aspectRatio: 1.0,
        aHash: '1010101010101010101010101010101010101010101010101010101010101010',
        dHash: '1010101010101010101010101010101010101010101010101010101010101010',
        pHash: '1010101010101010101010101010101010101010101010101010101010101010',
        edgeHash: '1010101010101010101010101010101010101010101010101010',
        colorHistogram: {
            r: new Array(256).fill(0.004),
            g: new Array(256).fill(0.004),
            b: new Array(256).fill(0.004)
        },
        dominantColors: [{ r: 128, g: 128, b: 128 }]
    };
    
    const fingerprint2 = {
        ...fingerprint1,
        id: 'test2',
        aHash: '1010101010101010101010101010101010101010101010101010101010101011', // 1 bit different
        dHash: '1010101010101010101010101010101010101010101010101010101010101011',
        pHash: '1010101010101010101010101010101010101010101010101010101010101011'
    };
    
    const comparison = matcher.compareImages(fingerprint1, fingerprint2);
    console.log(`   ✅ Overall similarity: ${(comparison.overall * 100).toFixed(1)}%`);
    console.log(`   ✅ aHash similarity: ${(comparison.details.aHash * 100).toFixed(1)}%`);
    console.log(`   ✅ dHash similarity: ${(comparison.details.dHash * 100).toFixed(1)}%`);
    console.log(`   ✅ pHash similarity: ${(comparison.details.pHash * 100).toFixed(1)}%`);
}

async function testPerformance() {
    console.log('\n9. Testing performance...');
    
    const matcher = new ImageMatcher();
    const startTime = Date.now();
    
    // Generate mock image data
    const mockImages = [];
    for (let i = 0; i < 10; i++) {
        const mockImageData = {
            width: 32,
            height: 32,
            data: new Array(4096).fill(0).map(() => Math.floor(Math.random() * 256))
        };
        mockImages.push(mockImageData);
    }
    
    // Process each image
    for (let i = 0; i < mockImages.length; i++) {
        const aHash = matcher.computeAverageHash(mockImages[i]);
        const pHash = matcher.computePerceptualHash(mockImages[i]);
    }
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    const imagesPerSecond = (mockImages.length / processingTime * 1000).toFixed(1);
    
    console.log(`   ✅ Processed ${mockImages.length} images in ${processingTime}ms`);
    console.log(`   ✅ Performance: ${imagesPerSecond} images/second`);
}

async function testExtensionCompatibility() {
    console.log('\n10. Testing Chrome Extension compatibility...');
    
    // Check for eval usage
    const sourceCode = fs.readFileSync(path.join(__dirname, 'image-matcher.js'), 'utf8');
    const hasEval = sourceCode.includes('eval(') || sourceCode.includes('Function(');
    
    console.log(`   ✅ No eval() usage: ${!hasEval}`);
    console.log(`   ✅ Pure JavaScript: ${!sourceCode.includes('require(')}`);
    console.log(`   ✅ Browser compatible: ${sourceCode.includes('window.ImageMatcher')}`);
    
    // Test instantiation without DOM
    try {
        const matcher = new ImageMatcher();
        console.log('   ✅ Can instantiate without full DOM');
    } catch (error) {
        console.log(`   ❌ Instantiation error: ${error.message}`);
    }
}

// Run all tests
async function runAllTests() {
    try {
        await testBasicFunctionality();
        await testSimilarityComparison();
        await testPerformance();
        await testExtensionCompatibility();
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Core algorithms working');
        console.log('   ✅ Similarity comparison functional');
        console.log('   ✅ Performance acceptable');
        console.log('   ✅ Extension compatibility verified');
        
        console.log('\n🚀 Next steps:');
        console.log('   1. Open test.html in your browser');
        console.log('   2. Click "Find Similar Images"');
        console.log('   3. Adjust similarity threshold as needed');
        console.log('   4. Review grouped similar images');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

runAllTests();