import { supabaseAdmin } from './supabase.js';

export async function createSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl;
}

export async function createSignedUploadUrl(bucket, path) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
  if (error) throw error;
  return data;
}
