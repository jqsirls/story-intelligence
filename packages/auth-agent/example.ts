/**
 * Example usage of AuthAgent
 * This demonstrates how to use the AuthAgent for Alexa account linking
 */

import { AuthAgent } from './src/auth-agent';
import { loadConfig } from './src/config';

async function main() {
  // Load configuration
  const config = loadConfig();
  
  // Create AuthAgent instance
  const authAgent = new AuthAgent(config);
  
  try {
    // Initialize the agent
    await authAgent.initialize();
    console.log('AuthAgent initialized successfully');

    // Example 1: Account linking from Alexa
    console.log('\n=== Account Linking Example ===');
    const linkingResponse = await authAgent.linkAccount({
      customerEmail: 'parent@example.com',
      alexaPersonId: 'amzn1.ask.person.EXAMPLE123',
      deviceType: 'voice',
      locale: 'en-US',
    });

    console.log('Account linking response:', {
      success: linkingResponse.success,
      voiceCode: linkingResponse.voiceCode,
      userId: linkingResponse.userId,
      expiresAt: linkingResponse.expiresAt,
    });

    if (linkingResponse.success && linkingResponse.voiceCode) {
      // Example 2: Voice code verification
      console.log('\n=== Voice Code Verification Example ===');
      const verificationResponse = await authAgent.verifyVoiceCode({
        email: 'parent@example.com',
        code: linkingResponse.voiceCode,
        alexaPersonId: 'amzn1.ask.person.EXAMPLE123',
        deviceType: 'voice',
      });

      console.log('Verification response:', {
        success: verificationResponse.success,
        accessToken: verificationResponse.accessToken ? 'Generated' : 'None',
        refreshToken: verificationResponse.refreshToken ? 'Generated' : 'None',
        expiresIn: verificationResponse.expiresIn,
        userId: verificationResponse.userId,
      });

      if (verificationResponse.success && verificationResponse.accessToken) {
        // Example 3: Token validation
        console.log('\n=== Token Validation Example ===');
        const userSession = await authAgent.validateToken(verificationResponse.accessToken);
        
        if (userSession) {
          console.log('User session:', {
            userId: userSession.userId,
            email: userSession.email,
            alexaPersonId: userSession.alexaPersonId,
            isEmailConfirmed: userSession.isEmailConfirmed,
            isCoppaProtected: userSession.isCoppaProtected,
          });

          // Example 4: Get user by Alexa Person ID
          console.log('\n=== Get User by Alexa Person ID Example ===');
          const userByAlexaId = await authAgent.getUserByAlexaPersonId('amzn1.ask.person.EXAMPLE123');
          
          if (userByAlexaId) {
            console.log('User found by Alexa Person ID:', {
              userId: userByAlexaId.userId,
              email: userByAlexaId.email,
              isEmailConfirmed: userByAlexaId.isEmailConfirmed,
            });
          }

          // Example 5: Token refresh
          if (verificationResponse.refreshToken) {
            console.log('\n=== Token Refresh Example ===');
            const refreshResponse = await authAgent.refreshToken(verificationResponse.refreshToken);
            
            console.log('Refresh response:', {
              success: refreshResponse.success,
              accessToken: refreshResponse.accessToken ? 'Refreshed' : 'None',
              expiresIn: refreshResponse.expiresIn,
            });

            // Example 6: Token revocation
            console.log('\n=== Token Revocation Example ===');
            await authAgent.revokeToken(verificationResponse.refreshToken);
            console.log('Refresh token revoked');
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Shutdown the agent
    await authAgent.shutdown();
    console.log('\nAuthAgent shutdown completed');
  }
}

// Example of handling different device types
async function screenDeviceExample() {
  const config = loadConfig();
  const authAgent = new AuthAgent(config);
  
  try {
    await authAgent.initialize();

    // Screen device with magic link
    const linkingResponse = await authAgent.linkAccount({
      customerEmail: 'parent@example.com',
      alexaPersonId: 'amzn1.ask.person.SCREEN123',
      deviceType: 'screen',
      locale: 'en-US',
    });

    console.log('Screen device linking:', {
      success: linkingResponse.success,
      voiceCode: linkingResponse.voiceCode,
      magicLinkUrl: linkingResponse.magicLinkUrl,
      qrCodeUrl: linkingResponse.qrCodeUrl,
    });

    // Example magic link verification
    if (linkingResponse.success && linkingResponse.voiceCode) {
      console.log('\n=== Magic Link Verification Example ===');
      const magicLinkResponse = await authAgent.verifyMagicLink({
        email: 'parent@example.com',
        code: linkingResponse.voiceCode,
        alexaPersonId: 'amzn1.ask.person.SCREEN123',
        deviceType: 'screen',
        userAgent: 'Mozilla/5.0 (Example Browser)',
        ipAddress: '192.168.1.1',
      });

      console.log('Magic link verification response:', {
        success: magicLinkResponse.success,
        accessToken: magicLinkResponse.accessToken ? 'Generated' : 'None',
        refreshToken: magicLinkResponse.refreshToken ? 'Generated' : 'None',
        expiresIn: magicLinkResponse.expiresIn,
        tokenType: magicLinkResponse.tokenType,
      });
    }

    // Example password reset
    console.log('\n=== Password Reset Example ===');
    const passwordResetResponse = await authAgent.initiatePasswordReset('parent@example.com');
    console.log('Password reset response:', {
      success: passwordResetResponse.success,
      error: passwordResetResponse.error,
    });

  } catch (error) {
    console.error('Screen device example error:', error.message);
  } finally {
    await authAgent.shutdown();
  }
}

// Example of error handling
async function errorHandlingExample() {
  const config = loadConfig();
  const authAgent = new AuthAgent(config);
  
  try {
    await authAgent.initialize();

    // Invalid email
    const invalidEmailResponse = await authAgent.linkAccount({
      customerEmail: 'invalid-email',
      alexaPersonId: 'amzn1.ask.person.EXAMPLE123',
      deviceType: 'voice',
      locale: 'en-US',
    });

    console.log('Invalid email response:', {
      success: invalidEmailResponse.success,
      error: invalidEmailResponse.error,
    });

    // Invalid voice code
    const invalidCodeResponse = await authAgent.verifyVoiceCode({
      email: 'parent@example.com',
      code: '000000',
      alexaPersonId: 'amzn1.ask.person.EXAMPLE123',
      deviceType: 'voice',
    });

    console.log('Invalid code response:', {
      success: invalidCodeResponse.success,
      error: invalidCodeResponse.error,
    });

  } catch (error) {
    console.error('Error handling example error:', error.message);
  } finally {
    await authAgent.shutdown();
  }
}

// Run examples
if (require.main === module) {
  console.log('Running AuthAgent examples...\n');
  
  main()
    .then(() => console.log('\nMain example completed'))
    .catch(console.error);
}

export { main, screenDeviceExample, errorHandlingExample };