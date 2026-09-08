import { getSupabaseServerClient } from "@/lib/supabase/server";

const fallbackApps = [
  {
    id: "corbin-email-guru",
    title: "Corbin Email Guru",
    category: "Sales Ops",
    summary: "Account based outreach for NICE teams",
    price: 39,
    currency: "USD",
  },
];

export async function listApps() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("apps").select("id,title,category,summary,price,currency").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? fallbackApps;
  } catch (error) {
    console.warn("Falling back to mock apps", error);
    return fallbackApps;
  }
}
