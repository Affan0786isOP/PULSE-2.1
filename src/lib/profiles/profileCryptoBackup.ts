import type { LocalProfile } from './idbProfileStorage';

export interface EncryptedBackupContainer {
  version: number;
  kdf: {
    algorithm: string;
    hash: string;
    iterations: number;
    salt: string;
  };
  cipher: {
    algorithm: string;
    iv: string;
    tagLength: number;
  };
  ciphertext: string;
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function exportEncryptedProfileBackup(
  profiles: LocalProfile[],
  passphrase: string
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 600000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const payload = JSON.stringify(profiles);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: enc.encode('PULSE_PROFILE_BACKUP_V1')
    },
    key,
    enc.encode(payload)
  );

  const container: EncryptedBackupContainer = {
    version: 1,
    kdf: {
      algorithm: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 600000,
      salt: bufferToBase64(salt.buffer)
    },
    cipher: {
      algorithm: 'AES-GCM',
      iv: bufferToBase64(iv.buffer),
      tagLength: 128
    },
    ciphertext: bufferToBase64(ciphertextBuffer)
  };

  return JSON.stringify(container, null, 2);
}

export async function importEncryptedProfileBackup(
  backupJson: string,
  passphrase: string
): Promise<LocalProfile[]> {
  const container = JSON.parse(backupJson) as EncryptedBackupContainer;
  if (!container || container.version !== 1) {
    throw new Error('Unsupported backup container version');
  }

  const salt = base64ToBuffer(container.kdf.salt);
  const iv = base64ToBuffer(container.cipher.iv);
  const ciphertext = base64ToBuffer(container.ciphertext);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: container.kdf.iterations || 600000,
      hash: container.kdf.hash || 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: enc.encode('PULSE_PROFILE_BACKUP_V1')
    },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuffer);
  return JSON.parse(jsonStr) as LocalProfile[];
}
