// Tenant credential vault â€” per-client secrets encrypted with AES-256-GCM.
// The database stores only ciphertext; the key lives in ENGINE_SECRET.
// This is the backend of the client admin portal's "Connect WhatsApp/Meta"
// flow: a client's tokens are theirs, isolated per org, never in code or env.
import crypto from 'node:crypto';
import { db } from '../lib/db';
import { env } from '../lib/env';

function masterKey(): Buffer {
  return crypto.createHash('sha256').update(env('ENGINE_SECRET')).digest();
}

function encrypt(plaintext: string): { ciphertext: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function decrypt(row: { ciphertext: string; iv: string; tag: string }): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(row.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(row.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(row.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export async function setCredential(orgId: string, service: string, key: string, value: string): Promise<void> {
  const enc = encrypt(value);
  const { error } = await db.from('sales_credentials').upsert(
    { org_id: orgId, service, key, ...enc, updated_at: new Date().toISOString() },
    { onConflict: 'org_id,service,key' },
  );
  if (error) throw new Error(`vault write ${service}/${key}: ${error.message}`);
}

export async function getCredential(orgId: string, service: string, key: string): Promise<string | null> {
  const { data, error } = await db.from('sales_credentials')
    .select('ciphertext,iv,tag')
    .eq('org_id', orgId).eq('service', service).eq('key', key)
    .maybeSingle();
  if (error) throw new Error(`vault read ${service}/${key}: ${error.message}`);
  return data ? decrypt(data) : null;
}

export async function getServiceCredentials(orgId: string, service: string): Promise<Record<string, string>> {
  const { data, error } = await db.from('sales_credentials')
    .select('key,ciphertext,iv,tag')
    .eq('org_id', orgId).eq('service', service);
  if (error) throw new Error(`vault read ${service}: ${error.message}`);
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.key] = decrypt(row);
  return out;
}

/** List configured services + key names for an org â€” safe for portal display (no values). */
export async function listCredentialKeys(orgId: string): Promise<Array<{ service: string; key: string; updated_at: string }>> {
  const { data, error } = await db.from('sales_credentials')
    .select('service,key,updated_at').eq('org_id', orgId).order('service');
  if (error) throw new Error(`vault list: ${error.message}`);
  return data ?? [];
}
