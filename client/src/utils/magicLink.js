import CryptoJS from 'crypto-js';

// Secret for encrypting magic link payload (obscures room data in URL)
// Set VITE_MAGIC_LINK_SECRET in .env for production; fallback is for dev
const SECRET = import.meta.env.VITE_MAGIC_LINK_SECRET || 'secure-chatroom-invite-2024';

/**
 * Encrypt room ID and encryption key for magic link
 * @param {string} roomId 
 * @param {string} roomPassword 
 * @returns {string} URL-safe encrypted string
 */
export function encryptMagicLinkPayload(roomId, roomPassword) {
  const payload = JSON.stringify({ room: roomId, key: roomPassword });
  const encrypted = CryptoJS.AES.encrypt(payload, SECRET).toString();
  return encodeURIComponent(encrypted);
}

/**
 * Decrypt magic link payload to get room ID and encryption key
 * @param {string} encrypted - URL-encoded encrypted string
 * @returns {{ room: string, key: string } | null}
 */
export function decryptMagicLinkPayload(encrypted) {
  try {
    const decoded = decodeURIComponent(encrypted);
    const bytes = CryptoJS.AES.decrypt(decoded, SECRET);
    const payload = bytes.toString(CryptoJS.enc.Utf8);
    if (!payload) return null;
    const data = JSON.parse(payload);
    if (data.room && data.key) return data;
    return null;
  } catch (e) {
    return null;
  }
}
