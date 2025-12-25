const getCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto;
  }
  throw new Error('Web Crypto API is not available. This function must be called in the browser.');
};

/**
 * Generates an ECDSA key pair using P-256 curve
 * @returns Promise containing both public and private CryptoKey objects
 */
export async function generateECDSAKeyPair(): Promise<CryptoKeyPair> {
  const crypto = getCrypto();
  
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256', // P-256 curve (also known as secp256r1)
    },
    true, // extractable - allows exporting the private key
    ['sign', 'verify'] // key usages
  );
  
  return keyPair;
}

/**
 * Converts a CryptoKey to PEM format string
 * @param key - The CryptoKey to export
 * @param type - 'private' or 'public'
 * @returns PEM formatted string
 */
async function keyToPEM(key: CryptoKey, type: 'private' | 'public'): Promise<string> {
  const crypto = getCrypto();
  
  const format = type === 'private' ? 'pkcs8' : 'spki';
  const exported = await crypto.subtle.exportKey(format, key);
  const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  
  const pemHeader = type === 'private' ? '-----BEGIN PRIVATE KEY-----' : '-----BEGIN PUBLIC KEY-----';
  const pemFooter = type === 'private' ? '-----END PRIVATE KEY-----' : '-----END PUBLIC KEY-----';
  
  // Split the base64 string into 64-character lines
  const pemBody = exportedAsBase64.match(/.{1,64}/g)?.join('\n') || exportedAsBase64;
  
  return `${pemBody}`;
}

/**
 * Exports the private key to PEM string format
 * @param privateKey - The private CryptoKey
 * @returns PEM formatted private key string
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  return keyToPEM(privateKey, 'private');
}

/**
 * Exports the public key to PEM string format
 * @param publicKey - The public CryptoKey
 * @returns PEM formatted public key string
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  return keyToPEM(publicKey, 'public');
}

/**
 * Imports a PEM formatted private key string back to CryptoKey
 * @param pemKey - PEM formatted private key string
 * @returns CryptoKey object
 */
export async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  const crypto = getCrypto();
  
  // Remove PEM header, footer, and whitespace
  const pemContents = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  // Convert base64 to binary
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return await crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign']
  );
}

/**
 * Imports a PEM formatted public key string back to CryptoKey
 * @param pemKey - PEM formatted public key string
 * @returns CryptoKey object
 */
export async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  const crypto = getCrypto();
  
  // Remove PEM header, footer, and whitespace
  const pemContents = pemKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  
  // Convert base64 to binary
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return await crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['verify']
  );
}

/**
 * Downloads a text file with the given content
 * @param filename - Name of the file to download
 * @param content - Content to write to the file
 */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

