import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// All half-hour slots as { value: "HH:MM" (24h), label: "H:MM AM/PM" }
const SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h24 = Math.floor(i / 2);
  const m = i % 2 === 0 ? 0 : 30;
  const isPM = h24 >= 12;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const label = `${h12}:${m === 0 ? "00" : "30"} ${isPM ? "PM" : "AM"}`;
  const value = `${String(h24).padStart(2, "0")}:${m === 0 ? "00" : "30"}`;
  return { value, label };
});

interface TimePickerProps {
  value: string; // "HH:MM" 24h format
  onChange: (value: string) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  // Snap to nearest slot if value doesn't match exactly
  const snapped = SLOTS.find(s => s.value === value)?.value ?? SLOTS[18].value; // default 9:00 AM

  return (
    <Select value={snapped} onValueChange={onChange}>
      <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {SLOTS.map(s => (
          <SelectItem key={s.value} value={s.value} className="text-[13px]">{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
