import { supabase } from "./supabaseClient";

/**
 * Upload a file to Supabase Storage.
 * Returns { file_url } to match the base44 UploadFile response shape.
 */
export async function uploadFile(file, bucket = "delivery-orders") {
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { file_url: data.publicUrl };
}

/**
 * Upload a stamp image — same helper, different bucket.
 */
export async function uploadStamp(file) {
  return uploadFile(file, "stamps");
}
