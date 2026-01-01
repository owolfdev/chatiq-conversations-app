// src/components/ui/color-picker.tsx
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  description?: string;
  error?: string;
  className?: string;
  /** Optional default color used for preview when value is null. */
  defaultColor?: string;
}

// Hex color validation regex: must be # followed by 6 hex digits
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function ColorPicker({
  label,
  value,
  onChange,
  description,
  error,
  className,
  defaultColor,
}: ColorPickerProps) {
  const [hexValue, setHexValue] = useState(value || "");
  const [localError, setLocalError] = useState<string | undefined>(error);

  // Sync with external value changes
  useEffect(() => {
    setHexValue(value || "");
  }, [value]);

  // Sync with external error changes
  useEffect(() => {
    setLocalError(error);
  }, [error]);

  // Normalize hex color: ensure it starts with # and is uppercase
  const normalizeHex = (input: string): string => {
    let normalized = input.trim();
    if (!normalized.startsWith("#")) {
      normalized = "#" + normalized;
    }
    return normalized.toUpperCase();
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setHexValue(input);

    // Allow empty input (for clearing)
    if (input === "" || input === "#") {
      setLocalError(undefined);
      onChange(null);
      return;
    }

    const normalized = normalizeHex(input);

    // Validate format
    if (HEX_COLOR_REGEX.test(normalized)) {
      setLocalError(undefined);
      onChange(normalized);
    } else if (normalized.length <= 7) {
      // Still typing, don't show error yet
      setLocalError(undefined);
    } else {
      // Invalid format
      setLocalError("Must be a valid hex color (e.g., #4A6FA5)");
    }
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const colorValue = e.target.value; // e.g., "#D48C8C"
    const normalized = colorValue.toUpperCase();
    setHexValue(normalized);
    setLocalError(undefined);
    onChange(normalized || null);
  };

  const handleBlur = () => {
    if (hexValue && hexValue !== "#") {
      const normalized = normalizeHex(hexValue);
      if (!HEX_COLOR_REGEX.test(normalized)) {
        setLocalError("Must be a valid hex color (e.g., #4A6FA5)");
      } else {
        setHexValue(normalized);
        onChange(normalized);
      }
    }
  };

  // Effective color used for native input / swatch: prefer explicit value, otherwise defaultColor
  const effectiveColor =
    (hexValue && HEX_COLOR_REGEX.test(hexValue) && hexValue) ||
    (defaultColor && HEX_COLOR_REGEX.test(defaultColor) && defaultColor) ||
    "#000000";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={`color-${label}`}>{label}</Label>
      <div className="flex items-center gap-2">
        {/* Native HTML5 color picker */}
        <div className="relative">
          <input
            type="color"
            id={`color-picker-${label}`}
            value={effectiveColor}
            onChange={handleColorInputChange}
            className="h-10 w-16 cursor-pointer rounded-md border border-input bg-background"
            title="Pick a color"
          />
        </div>
        {/* Hex text input */}
        <Input
          id={`color-${label}`}
          type="text"
          value={hexValue}
          onChange={handleHexChange}
          onBlur={handleBlur}
          placeholder={defaultColor || "#4A6FA5"}
          className={cn(
            "flex-1 font-mono",
            localError && "border-destructive focus-visible:ring-destructive"
          )}
          maxLength={7}
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {localError && (
        <p className="text-xs text-destructive">{localError}</p>
      )}
    </div>
  );
}

