import CryptoJS from 'crypto-js';

/**
 * Implements the Crash Game result formula as described in the BC.Game reseeding event.
 * @param seed The game seed (hex string)
 * @param salt The salt (usually a bitcoin block hash)
 * @returns The multiplier result (e.g. 1.25)
 */
export const calculateCrashPoint = (seed: string, salt: string): number => {
  const nBits = 52; // number of most significant bits to use

  // 1. HMAC_SHA256(message=seed, key=salt)
  // Note: seed is expected to be hex representation
  const hmac = CryptoJS.HmacSHA256(CryptoJS.enc.Hex.parse(seed), salt);
  const newSeed = hmac.toString(CryptoJS.enc.Hex);

  // 2. r = 52 most significant bits
  // 52 bits = 13 hex characters (52/4)
  const hexPart = newSeed.slice(0, nBits / 4);
  const r = parseInt(hexPart, 16);

  // 3. X = r / 2^52
  let X = r / Math.pow(2, nBits); // uniformly distributed in [0; 1)
  X = parseFloat(X.toPrecision(9));

  // 4. X = 99 / (1-X)
  X = 99 / (1 - X);

  // 5. return max(trunc(X), 1)
  // The original formula says return max(trunc(X), 100) / 100, which is max(1, trunc(X)/100)
  const result = Math.floor(X);
  return Math.max(1, result / 100);
};

/**
 * In Crash games, the sequence of seeds is usually a hash chain.
 * Given a hash, the "previous" hash (used in the game before) is often its SHA256 hash.
 * This depends on the specific implementation, but for BC.Game/Luckyfish etc:
 * currentHash = SHA256(nextHash)
 * So to go BACKWARDS in history, you SHA256 the seed? 
 * Actually, usually the games are played from the end of the chain to the start.
 * So if you have game N, hashing it gives the seed for game N-1.
 */
export const getPreviousHash = (hash: string): string => {
  return CryptoJS.SHA256(hash).toString(CryptoJS.enc.Hex);
};

/**
 * Generates a random 64-character hex seed.
 */
export const generateRandomSeed = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
};
