import { VaniAgriGateway } from './VaniAgriGateway';
import { ProfileData } from './models/FarmerProfile';

async function demonstrateLoginAndRegistration() {
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
  const gateway = new VaniAgriGateway(encryptionKey, 10);

  const farmerPhone = '+919876543210';
  const callId = 'call_001';

  const loginResult = await gateway.handleIncomingCall(farmerPhone, callId);
  console.log('Login Result:', loginResult);

  if (loginResult.type === 'new_user_registration') {
    const profileData: ProfileData = {
      name: 'Ravi Kumar',
      location: {
        state: 'Karnataka',
        district: 'Mysore',
        village: 'Hunsur'
      },
      primaryCrops: ['Rice', 'Sugarcane'],
      preferredLanguage: 'kannada',
      farmSize: 5
    };

    const registrationResult = await gateway.completeRegistration(farmerPhone, profileData);
    console.log('Registration Result:', registrationResult);
  }

  const profileManager = gateway.getProfileManager();
  const profile = await profileManager.getProfile(farmerPhone);
  console.log('Farmer Profile:', profile);

  const sessionManager = gateway.getSessionManager();
  const activeSession = await gateway.getActiveSession(farmerPhone);
  console.log('Active Session:', activeSession);

  if (activeSession) {
    await sessionManager.addInteraction(activeSession.sessionId, {
      sessionId: activeSession.sessionId,
      timestamp: new Date(),
      channel: 'voice',
      query: 'What is the weather forecast?',
      response: 'The weather will be sunny with 30°C temperature.'
    });

    await sessionManager.updateSessionContext(activeSession.sessionId, {
      currentTopic: 'weather',
      previousQueries: ['weather forecast']
    });
  }

  if (activeSession) {
    await gateway.handleCallEnd(activeSession.sessionId);
    console.log('Call ended successfully');
  }

  const secondCallId = 'call_002';
  const resumeResult = await gateway.handleIncomingCall(farmerPhone, secondCallId);
  console.log('Resume Result:', resumeResult);
}

demonstrateLoginAndRegistration().catch(console.error);
