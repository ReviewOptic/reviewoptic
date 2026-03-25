import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimePickerProps {
  value: string; // "HH:MM" 24h format, or ""
  onChange: (value: string) => void;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 30];

export function TimePicker({ value, onChange }: TimePickerProps) {
  const hour24 = value ? parseInt(value.split(":")[0], 10) : 9;
  const rawMinute = value ? parseInt(value.split(":")[1], 10) : 0;
  const minute = rawMinute >= 30 ? 30 : 0; // snap to nearest half-hour
  const isPM = hour24 >= 12;
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;

  const emit = (h12: number, m: number, pm: boolean) => {
    const h24 = pm ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Select value={String(hour12)} onValueChange={v => emit(Number(v), minute, isPM)}>
        <SelectTrigger className="w-[68px] text-[13px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {HOURS.map(h => (
            <SelectItem key={h} value={String(h)} className="text-[13px]">{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-[13px]">:</span>
      <Select value={String(minute)} onValueChange={v => emit(hour12, Number(v), isPM)}>
        <SelectTrigger className="w-[68px] text-[13px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MINUTES.map(m => (
            <SelectItem key={m} value={String(m)} className="text-[13px]">{String(m).padStart(2, "0")}</SelectItem>
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
