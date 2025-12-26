import { PDFDocument, rgb } from 'pdf-lib';
import { importPrivateKey, importPublicKey } from './crypto';

/**
 * Signs a PDF file with the user's private key
 * Simple approach: Hash original PDF, sign it, embed signature
 * Verification checks the original PDF fingerprint
 */
export async function signPDF(
  pdfFile: File,
  privateKeyPEM: string,
  username: string
): Promise<Blob> {
  try {
    // Step 1: Read the ORIGINAL PDF bytes (unchanged)
    const originalArrayBuffer = await pdfFile.arrayBuffer();
    const originalBytes = new Uint8Array(originalArrayBuffer);

    // Step 2: Calculate hash of ORIGINAL PDF
    const hashBuffer = await crypto.subtle.digest('SHA-256', originalBytes);
    const hashArray = new Uint8Array(hashBuffer);
    const hashBase64 = btoa(String.fromCharCode(...hashArray));

    // Step 3: Sign the hash
    const privateKey = await importPrivateKey(privateKeyPEM);
    const signatureBuffer = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      privateKey,
      hashArray
    );
    const signatureArray = new Uint8Array(signatureBuffer);
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray));

    const timestamp = new Date().toISOString();

    // Step 4: Create signature package (includes original file size for verification)
    const signaturePackage = JSON.stringify({
      signature: signatureBase64,
      documentHash: hashBase64,
      originalSize: originalBytes.length,
      username: username,
      timestamp: timestamp,
      algorithm: 'ECDSA-P256-SHA256',
    });

    // Step 5: Append signature to PDF as a comment at the end
    // PDF comments start with %
    const signatureComment = `\n%DigiSign-Signature-Start\n${signaturePackage}\n%DigiSign-Signature-End\n`;
    const signatureBytes = new TextEncoder().encode(signatureComment);

    // Step 6: Combine original PDF + signature
    const signedPdfBytes = new Uint8Array(originalBytes.length + signatureBytes.length);
    signedPdfBytes.set(originalBytes, 0);
    signedPdfBytes.set(signatureBytes, originalBytes.length);

    return new Blob([signedPdfBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error signing PDF:', error);
    throw new Error('Failed to sign PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Extracts signature information from a signed PDF
 */
export async function extractSignature(pdfFile: File): Promise<{
  signature: string;
  documentHash: string;
  originalSize: number;
  username: string;
  timestamp: string;
  algorithm: string;
} | null> {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(bytes);

    // Look for signature markers
    const startMarker = '%DigiSign-Signature-Start';
    const endMarker = '%DigiSign-Signature-End';

    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    // Extract JSON between markers
    const jsonStart = startIndex + startMarker.length;
    const signatureJson = text.substring(jsonStart, endIndex).trim();

    const signatureData = JSON.parse(signatureJson);
    return signatureData;
  } catch (error) {
    console.error('Error extracting signature:', error);
    return null;
  }
}

/**
 * Downloads a blob as a file
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Verifies a signed PDF using the signer's public key
 * @param pdfFile - The signed PDF file
 * @param username - The username to verify against
 * @returns Object with verification result and details
 */
export async function verifyPDF(
  pdfFile: File,
  username: string
): Promise<{
  isValid: boolean;
  message: string;
  details?: {
    signer: string;
    timestamp: string;
    algorithm: string;
  };
}> {
  try {
    // Step 1: Extract signature data
    const signatureData = await extractSignature(pdfFile);
    
    if (!signatureData) {
      return {
        isValid: false,
        message: 'No signature found in the PDF. This document is not signed.'
      };
    }

    // Step 2: Verify username matches
    if (signatureData.username !== username) {
      return {
        isValid: false,
        message: `Username mismatch. Document was signed by "${signatureData.username}", not "${username}".`,
        details: {
          signer: signatureData.username,
          timestamp: signatureData.timestamp,
          algorithm: signatureData.algorithm,
        }
      };
    }

    // Step 3: Extract the ORIGINAL PDF (without signature)
    const arrayBuffer = await pdfFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Get only the original PDF bytes (before signature was appended)
    const originalPdfBytes = bytes.slice(0, signatureData.originalSize);

    // Step 4: Calculate hash of the original PDF
    const currentHashBuffer = await crypto.subtle.digest('SHA-256', originalPdfBytes);
    const currentHashArray = new Uint8Array(currentHashBuffer);
    const currentHashBase64 = btoa(String.fromCharCode(...currentHashArray));

    // Step 5: Compare hashes
    if (currentHashBase64 !== signatureData.documentHash) {
      return {
        isValid: false,
        message: 'Document has been modified after signing. The content does not match the original signed document.',
        details: {
          signer: signatureData.username,
          timestamp: signatureData.timestamp,
          algorithm: signatureData.algorithm,
        }
      };
    }

    // Step 6: Fetch public key from backend
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/pubkey/${username}`);
    
    if (!response.ok) {
      return {
        isValid: false,
        message: `User "${username}" not found in the system.`
      };
    }

    const { data } = await response.json();
    const publicKeyPEM = data.publicKey;

    // Step 7: Import the public key
    const publicKey = await importPublicKey(publicKeyPEM);

    // Step 8: Decode signature from base64
    const signatureBytes = Uint8Array.from(atob(signatureData.signature), c => c.charCodeAt(0));
    const hashBytes = Uint8Array.from(atob(signatureData.documentHash), c => c.charCodeAt(0));

    // Step 9: Verify the signature
    const isValid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      publicKey,
      signatureBytes,
      hashBytes
    );

    if (isValid) {
      return {
        isValid: true,
        message: 'Signature is valid! This document was authentically signed by the specified user and has not been modified.',
        details: {
          signer: signatureData.username,
          timestamp: signatureData.timestamp,
          algorithm: signatureData.algorithm,
        }
      };
    } else {
      return {
        isValid: false,
        message: 'Signature verification failed. The signature does not match the signer\'s public key.',
        details: {
          signer: signatureData.username,
          timestamp: signatureData.timestamp,
          algorithm: signatureData.algorithm,
        }
      };
    }

  } catch (error) {
    console.error('Verification error:', error);
    return {
      isValid: false,
      message: 'Error during verification: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
}
