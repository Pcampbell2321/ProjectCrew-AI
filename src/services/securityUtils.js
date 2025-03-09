const crypto = require('crypto');

/**
 * Security Utilities
 * Provides encryption and security-related functions
 */
class SecurityUtils {
  /**
   * Encrypt text using AES-256-GCM
   * @param {String} text - Text to encrypt
   * @param {Buffer|String} key - Encryption key (32 bytes)
   * @returns {String} - Encrypted text with IV and auth tag
   */
  static encrypt(text, key) {
    // Ensure key is proper length for AES-256
    const keyBuffer = typeof key === 'string' ? 
      crypto.createHash('sha256').update(key).digest() : key;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt text using AES-256-GCM
   * @param {String} encryptedText - Encrypted text (iv:authTag:encryptedData)
   * @param {Buffer|String} key - Decryption key (32 bytes)
   * @returns {String} - Decrypted text
   */
  static decrypt(encryptedText, key) {
    // Ensure key is proper length for AES-256
    const keyBuffer = typeof key === 'string' ? 
      crypto.createHash('sha256').update(key).digest() : key;
    
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate a secure random key
   * @param {Number} bytes - Key length in bytes (default: 32 for AES-256)
   * @returns {Buffer} - Random key
   */
  static generateKey(bytes = 32) {
    return crypto.randomBytes(bytes);
  }

  /**
   * Hash sensitive data
   * @param {String} data - Data to hash
   * @param {String} salt - Salt for the hash
   * @returns {String} - Hashed data
   */
  static hashData(data, salt = '') {
    return crypto
      .createHash('sha256')
      .update(data + salt)
      .digest('hex');
  }

  /**
   * Create a secure token
   * @param {Number} length - Token length in bytes
   * @returns {String} - Secure token
   */
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

module.exports = SecurityUtils;
