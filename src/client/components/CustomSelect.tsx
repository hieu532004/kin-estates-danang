import React, { useState, useRef, useEffect } from "react";
import { IconChevronDown, IconCheck } from "./Icons";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (val: string) => void;
  variant?: "hero" | "pill";
}

/**
 * Bespoke Architectural React Popover Select
 * Replaces ugly native Windows <select> with a smooth glassmorphic custom menu.
 */
export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  onChange,
  variant = "hero"
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`astryx-select-root variant-${variant} ${open ? "is-open" : ""}`}
    >
      {label && <span className="astryx-select-label">{label}</span>}

      <button
        type="button"
        className="astryx-select-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        title={selected?.label}
      >
        <span className="astryx-select-value">{selected?.label}</span>
        <span className={`astryx-select-chevron ${open ? "rotated" : ""}`}>
          <IconChevronDown size={15} />
        </span>
      </button>

      {open && (
        <div className="astryx-select-popover" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`astryx-select-option ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <div className="astryx-option-text">
                  <span className="astryx-option-main">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="astryx-option-sub">{opt.sublabel}</span>
                  )}
                </div>
                {isSelected && (
                  <span className="astryx-option-check">
                    <IconCheck size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
