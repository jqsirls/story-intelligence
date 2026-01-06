// Global teardown for integration tests
const { execSync } = require('child_process');

module.exports = async () => {
  console.log('🧹 Tearing down integration test environment...');
  
  try {
    // Stop local infrastructure if we started it
    if (process.env.CI !== 'true') {
      console.log('Stopping local Redis...');
      execSync('docker-compose down', { stdio: 'inherit' });
    }
    
    console.log('✅ Integration test environment cleaned up');
  } catch (error) {
    console.error('❌ Failed to teardown integration test environment:', error);
    // Don't exit with error on teardown failure
  }
};