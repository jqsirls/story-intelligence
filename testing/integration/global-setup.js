// Global setup for integration tests
const { execSync } = require('child_process');

module.exports = async () => {
  console.log('🚀 Setting up integration test environment...');
  
  try {
    // Start local infrastructure if not already running
    if (process.env.CI !== 'true') {
      console.log('Starting local Redis...');
      execSync('docker-compose up -d redis', { stdio: 'inherit' });
      
      // Wait for Redis to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('✅ Integration test environment ready');
  } catch (error) {
    console.error('❌ Failed to setup integration test environment:', error);
    process.exit(1);
  }
};