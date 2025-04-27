import { Select, SelectItem } from "@heroui/select";

interface Option {
  label: string;
  value: string;
}

interface FilterSelectProps {
  label: string;
  placeholder: string;
  selectedKey: string;
  onChange: (key: string) => void;
  options: Option[];
}

export const FilterSelect = ({ label, placeholder, selectedKey, onChange, options }: FilterSelectProps) => {
  return (
    <Select
      label={label}
      placeholder={placeholder}
      selectedKey={selectedKey}
      onSelectionChange={(key) => onChange(key as string)}
    >
      {options.map((option) => (
        <SelectItem key={option.value}>{option.label}</SelectItem>
      ))}
    </Select>
  );
};

