// src/app/actions/admin/update-pricing.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { clearPricingCache } from "@/lib/cost-tracking";

export async function updateModelPricing({
  model,
  inputPricePer1M,
  outputPricePer1M,
  notes,
}: {
  model: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  // Verify admin access
  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return {
      success: false,
      error: "Admin access required to update pricing.",
    };
  }

  const admin = createAdminClient();

  try {
    // First, mark any existing active pricing as superseded
    await admin
      .from("admin_pricing")
      .update({ effective_until: new Date().toISOString() })
      .eq("model", model)
      .is("effective_until", null);

    // Insert new pricing record
    const { error } = await admin.from("admin_pricing").insert({
      model,
      input_price_per_1m_tokens: inputPricePer1M,
      output_price_per_1m_tokens: outputPricePer1M,
      effective_from: new Date().toISOString(),
      effective_until: null, // Active pricing
      created_by: user.id,
      notes: notes || `Updated by admin`,
    });

    if (error) {
      console.error("Failed to update pricing:", error);
      return {
        success: false,
        error: `Failed to update pricing: ${error.message}`,
      };
    }

    // Clear pricing cache to force immediate refresh
    clearPricingCache();

    revalidatePath("/dashboard/admin/costs");

    return {
      success: true,
      message: `Pricing updated for ${model}`,
    };
  } catch (error) {
    console.error("Error updating pricing:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update pricing",
    };
  }
}

export async function getCurrentPricing() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  // Verify admin access
  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return {
      success: false,
      error: "Admin access required.",
    };
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("admin_pricing")
    .select("*")
    .is("effective_until", null)
    .order("model", { ascending: true });

  if (error) {
    return {
      success: false,
      error: `Failed to fetch pricing: ${error.message}`,
    };
  }

  return {
    success: true,
    pricing: data || [],
  };
}

