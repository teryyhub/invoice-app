import { supabase } from "./supabaseClient";

export const customersApi = {
  async list(vendorId) {
    const { data, error } = await supabase.from("customers").select("*").eq("vendor_id", vendorId).order("name");
    if (error) throw error;
    return data;
  },
  async create(customer) {
    const { data, error } = await supabase.from("customers").insert(customer).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, customer) {
    const { data, error } = await supabase.from("customers").update(customer).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;
  },
};
