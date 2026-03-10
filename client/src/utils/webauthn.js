/**
 * WebAuthn Biometric Authentication Utility
 * Provides hardware-level security for high-clearance messages
 */

// Check if WebAuthn is supported
export const isWebAuthnSupported = () => {
  return !!(navigator.credentials && navigator.credentials.create && navigator.credentials.get);
};

// Check if platform authenticator (FaceID/TouchID/Windows Hello) is available
export const isPlatformAuthenticatorAvailable = async () => {
  if (!isWebAuthnSupported()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.warn('Platform authenticator check failed:', error);
    return false;
  }
};

/**
 * Register a new biometric credential for the user
 * @param {string} username - User's username
 * @param {string} roomId - Current room ID for scoping
 * @returns {Promise<{credentialId: string, publicKey: string}>}
 */
export const registerBiometric = async (username, roomId) => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn not supported on this device');
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "Secure Chat Room",
      id: window.location.hostname,
    },
    user: {
      id: new TextEncoder().encode(`${username}@${roomId}`),
      name: username,
      displayName: `${username} (${roomId})`,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Require platform authenticator
      userVerification: "required",
      requireResidentKey: false,
    },
    timeout: 60000,
    attestation: "none",
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });

    if (!credential) {
      throw new Error('Failed to create credential');
    }

    // Store credential info in localStorage for this room
    const credentialData = {
      credentialId: Array.from(new Uint8Array(credential.rawId)),
      username,
      roomId,
      createdAt: Date.now(),
    };

    const storageKey = `biometric_${roomId}_${username}`;
    localStorage.setItem(storageKey, JSON.stringify(credentialData));

    return {
      credentialId: Array.from(new Uint8Array(credential.rawId)),
      publicKey: Array.from(new Uint8Array(credential.response.getPublicKey())),
    };
  } catch (error) {
    console.error('Biometric registration failed:', error);
    throw new Error(`Biometric setup failed: ${error.message}`);
  }
};

/**
 * Authenticate using biometric credential
 * @param {string} username - User's username
 * @param {string} roomId - Current room ID
 * @returns {Promise<boolean>}
 */
export const authenticateBiometric = async (username, roomId) => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn not supported on this device');
  }

  // Get stored credential
  const storageKey = `biometric_${roomId}_${username}`;
  const storedCredential = localStorage.getItem(storageKey);
  
  if (!storedCredential) {
    throw new Error('No biometric credential found. Please set up biometric authentication first.');
  }

  const credentialData = JSON.parse(storedCredential);
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [{
      id: new Uint8Array(credentialData.credentialId),
      type: 'public-key',
    }],
    userVerification: 'required',
    timeout: 60000,
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });

    if (!assertion) {
      throw new Error('Authentication failed');
    }

    // Authentication successful
    return true;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    
    // Handle specific error cases
    if (error.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled or failed');
    } else if (error.name === 'InvalidStateError') {
      throw new Error('Biometric authenticator is not available');
    } else {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
};

/**
 * Check if user has biometric credential set up for this room
 * @param {string} username - User's username
 * @param {string} roomId - Current room ID
 * @returns {boolean}
 */
export const hasBiometricCredential = (username, roomId) => {
  const storageKey = `biometric_${roomId}_${username}`;
  return !!localStorage.getItem(storageKey);
};

/**
 * Remove biometric credential for this room
 * @param {string} username - User's username
 * @param {string} roomId - Current room ID
 */
export const removeBiometricCredential = (username, roomId) => {
  const storageKey = `biometric_${roomId}_${username}`;
  localStorage.removeItem(storageKey);
};

/**
 * Get biometric capability info for UI display
 * @returns {Promise<{supported: boolean, available: boolean, type: string}>}
 */
export const getBiometricCapabilities = async () => {
  const supported = isWebAuthnSupported();
  
  if (!supported) {
    return {
      supported: false,
      available: false,
      type: 'none',
    };
  }

  const available = await isPlatformAuthenticatorAvailable();
  
  // Detect likely biometric type based on platform
  let type = 'biometric';
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    type = 'Face ID / Touch ID';
  } else if (userAgent.includes('mac')) {
    type = 'Touch ID';
  } else if (userAgent.includes('windows')) {
    type = 'Windows Hello';
  } else if (userAgent.includes('android')) {
    type = 'Fingerprint / Face Unlock';
  }

  return {
    supported,
    available,
    type,
  };
};