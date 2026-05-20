import { supabase } from "./supabaseClient";

export const vendorProfileApi = {
  async get(userId) {
    const { data, error } = await supabase.from("vendor_profiles").select("*").eq("user_id", userId).single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  },
  async upsert(userId, profile) {
    const { data, error } = await supabase
      .from("vendor_profiles")
      .upsert({ ...profile, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
