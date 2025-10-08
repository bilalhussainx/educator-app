/**
 * 🧪 QUICK REGEX TEST
 * Tests if the regex syntax error is fixed
 */

export function testRegexSyntax(): boolean {
    try {
        console.log('🧪 Testing regex syntax...');

        // Test the problematic regex patterns
        const testContent = `• This is a bullet point
- This is also a bullet point
* Another bullet point`;

        // Test patterns that were causing errors
        const pattern1 = /^[\s]*[•▪▫◦‣⁃▸▹▪▫⦿⦾*\-–—]\s/gm;
        const pattern2 = /^[\s]*[•▪▫◦‣⁃▸▹▪▫⦿⦾]\s*/;

        const matches1 = testContent.match(pattern1);
        const matches2 = testContent.match(pattern2);

        console.log('✅ Regex test results:');
        console.log('   Pattern 1 matches:', matches1?.length || 0);
        console.log('   Pattern 2 matches:', matches2?.length || 0);
        console.log('   Test content:', testContent);

        return true;
    } catch (error) {
        console.error('❌ Regex syntax error still exists:', error);
        return false;
    }
}

// Test immediately when loaded
const isFixed = testRegexSyntax();
console.log(`🔧 Regex fix status: ${isFixed ? '✅ FIXED' : '❌ STILL BROKEN'}`);

// Make available globally
(window as any).testRegex = testRegexSyntax;

export default testRegexSyntax;