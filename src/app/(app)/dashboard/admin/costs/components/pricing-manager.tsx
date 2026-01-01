// src/app/dashboard/admin/costs/components/pricing-manager.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  updateModelPricing,
  getCurrentPricing,
} from "@/app/actions/admin/update-pricing";
import { Settings } from "lucide-react";

interface PricingRecord {
  id: string;
  model: string;
  input_price_per_1m_tokens: number;
  output_price_per_1m_tokens: number;
  effective_from: string;
  notes?: string;
}

export function PricingManager() {
  const [pricing, setPricing] = useState<PricingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [inputPrice, setInputPrice] = useState("");
  const [outputPrice, setOutputPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPricing = async () => {
    try {
      setLoading(true);
      const result = await getCurrentPricing();
      if (result.success && result.pricing) {
        setPricing(result.pricing as PricingRecord[]);
      }
    } catch (error) {
      console.error("Failed to load pricing:", error);
      toast.error("Failed to load pricing");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (model: PricingRecord) => {
    setEditingModel(model.model);
    setInputPrice((model.input_price_per_1m_tokens * 1_000_000).toString());
    setOutputPrice((model.output_price_per_1m_tokens * 1_000_000).toString());
    setNotes(model.notes || "");
  };

  const handleCancel = () => {
    setEditingModel(null);
    setInputPrice("");
    setOutputPrice("");
    setNotes("");
  };

  const handleSave = async () => {
    if (!editingModel) return;

    const inputPriceNum = parseFloat(inputPrice);
    const outputPriceNum = parseFloat(outputPrice);

    if (isNaN(inputPriceNum) || inputPriceNum < 0) {
      toast.error("Invalid input price");
      return;
    }

    if (isNaN(outputPriceNum) || outputPriceNum < 0) {
      toast.error("Invalid output price");
      return;
    }

    setSaving(true);
    try {
      const result = await updateModelPricing({
        model: editingModel,
        inputPricePer1M: inputPriceNum,
        outputPricePer1M: outputPriceNum,
        notes,
      });

      if (result.success) {
        toast.success(result.message || "Pricing updated successfully");
        handleCancel(); // Reset form and close dialog
        await loadPricing(); // Reload pricing
      } else {
        toast.error(result.error || "Failed to update pricing");
      }
    } catch (error) {
      console.error("Failed to update pricing:", error);
      toast.error("Failed to update pricing");
    } finally {
      setSaving(false);
    }
  };

  // Load pricing on mount
  useEffect(() => {
    loadPricing();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Model Pricing</CardTitle>
            <CardDescription>
              Manage OpenAI model pricing. Updates take effect immediately for
              new cost calculations.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadPricing}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading pricing...</p>
        ) : pricing.length === 0 ? (
          <p className="text-muted-foreground">No pricing data available.</p>
        ) : (
          <div className="space-y-4">
            {pricing.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{model.model}</div>
                  <div className="text-sm text-muted-foreground">
                    Input: ${model.input_price_per_1m_tokens.toFixed(2)} / 1M
                    tokens
                    {model.output_price_per_1m_tokens > 0 && (
                      <>
                        {" "}
                        • Output: ${model.output_price_per_1m_tokens.toFixed(
                          2
                        )}{" "}
                        / 1M tokens
                      </>
                    )}
                  </div>
                  {model.notes && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {model.notes}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Effective from:{" "}
                    {new Date(model.effective_from).toLocaleDateString()}
                  </div>
                </div>
                <Dialog
                  open={editingModel === model.model}
                  onOpenChange={(open) => {
                    if (!open) {
                      handleCancel();
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(model)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Pricing: {model.model}</DialogTitle>
                      <DialogDescription>
                        Update pricing per 1M tokens. Changes take effect
                        immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="input-price" className="mb-2 block">
                          Input Price (per 1M tokens)
                        </Label>
                        <Input
                          id="input-price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={inputPrice}
                          onChange={(e) => setInputPrice(e.target.value)}
                          placeholder="0.50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="output-price" className="mb-2 block">
                          Output Price (per 1M tokens)
                        </Label>
                        <Input
                          id="output-price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={outputPrice}
                          onChange={(e) => setOutputPrice(e.target.value)}
                          placeholder="1.50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="notes" className="mb-2 block">
                          Notes (optional)
                        </Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g., Updated pricing as of Dec 2024"
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
