import { supabase } from './supabase';

/**
 * Upload avatar image to Supabase Storage.
 * File is stored at: avatars/{userId}/avatar.{ext}
 */
export async function uploadAvatar(userId: string, uri: string) {
  // Determine file extension from URI
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${userId}/avatar.${ext}`;

  // Fetch image as blob
  const response = await fetch(uri);
  const blob = await response.blob();

  // Convert blob to arraybuffer for Supabase
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, arrayBuffer, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: true,
    });

  if (error) throw error;

  // Get public URL
  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Delete avatar from storage.
 */
export async function deleteAvatar(userId: string) {
  // List files in user's folder
  const { data: files, error: listError } = await supabase.storage
    .from('avatars')
    .list(userId);

  if (listError) throw listError;

  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    const { error } = await supabase.storage.from('avatars').remove(paths);
    if (error) throw error;
  }
}
