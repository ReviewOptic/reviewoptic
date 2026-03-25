import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Half-hour slots for 12-hour display (12:00, 12:30, 1:00 … 11:30)
const SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h12 = i === 0 ? 12 : Math.floor(i / 2) === 0 ? 12 : Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const h = Math.floor(i / 2);
  return { label: `${h === 0 ? 12 : h}:${m}`, h12: h === 0 ? 12 : h, m: i % 2 === 0 ? 0 : 30 };
});

interface TimePickerProps {
  value: string; // "HH:MM" 24h format
  onChange: (value: string) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const hour24 = value ? parseInt(value.split(":")[0], 10) : 9;
  const rawMinute = value ? parseInt(value.split(":")[1], 10) : 0;
  const minute = rawMinute >= 30 ? 30 : 0;
  const isPM = hour24 >= 12;
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;

  const slotValue = `${hour12}:${minute === 0 ? "00" : "30"}`;

  const emit = (h12: number, m: number, pm: boolean) => {
    const h24 = pm ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={slotValue}
        onValueChange={v => {
          const [h, m] = v.split(":").map(Number);
          emit(h, m, isPM);
        }}
      >
        <SelectTrigger className="w-28 text-[13px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SLOTS.map(s => (
            <SelectItem key={s.label} value={s.label} className="text-[13px]">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex rounded-md border border-input overflow-hidden text-[12px] font-medium">
        <button
          type="button"
          onClick={() => emit(hour12, minute, false)}
          className={`px-3 py-2 transition-colors ${!isPM ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => emit(hour12, minute, true)}
          className={`px-3 py-2 transition-colors ${isPM ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
        >
          PM
        </button>
      </div>
    </div>
  );
}
