import CryptoJS from 'crypto-js';

const calculateCrashPoint = (seed, salt) => {
  const nBits = 52;
  const hmac = CryptoJS.HmacSHA256(CryptoJS.enc.Hex.parse(seed), salt);
  const newSeed = hmac.toString(CryptoJS.enc.Hex);
  const hexPart = newSeed.slice(0, nBits / 4);
  const r = parseInt(hexPart, 16);
  let X = r / Math.pow(2, nBits);
  X = parseFloat(X.toPrecision(9));
  X = 99 / (1 - X);
  const result = Math.floor(X);
  return Math.max(1, result / 100);
};

const seed = "634d93fef0d2e45e585b4ce0dc60909aebf1e604800f75212b3df14e20382e49";
const salt = "0000000000000000000301e2801a9a9598bfb114e574a91a887f2132f33047e6";
console.log(calculateCrashPoint(seed, salt));
