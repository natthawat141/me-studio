"use client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
type Option = { value: string; label: string };
export function ModelSelect({
  value,
  onChange,
  options,
  label,
  placeholder = "เลือก",
  disabled = false,
  onOpenChange,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  label: string;
  placeholder?: string;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Select
      onOpenChange={onOpenChange}
      disabled={disabled}
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(v);
      }}
      items={options}
    >
      <SelectTrigger aria-label={label} className="studio-select-trigger">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className="studio-select-content"
        align="start"
        alignItemWithTrigger={false}
      >
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              className="studio-select-item"
              key={option.value}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
