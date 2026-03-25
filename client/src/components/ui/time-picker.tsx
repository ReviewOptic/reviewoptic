import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const emit = (h12: number, m: number, pm: boolean) => {
    const h24 = pm ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const toggleClass = (active: boolean) =>
    `px-3 py-2 text-[12px] font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="flex items-center gap-1.5">
      {/* Hour */}
      <Select value={String(hour12)} onValueChange={v => emit(Number(v), minute, isPM)}>
        <SelectTrigger className="w-20 text-[13px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
            <SelectItem key={h} value={String(h)} className="text-[13px]">{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Minute toggle */}
      <div className="flex rounded-md border border-input overflow-hidden">
        <button type="button" onClick={() => emit(hour12, 0, isPM)} className={toggleClass(minute === 0)}>00</button>
        <button type="button" onClick={() => emit(hour12, 30, isPM)} className={toggleClass(minute === 30)}>30</button>
      </div>

      {/* AM/PM toggle */}
      <div className="flex rounded-md border border-input overflow-hidden">
        <button type="button" onClick={() => emit(hour12, minute, false)} className={toggleClass(!isPM)}>AM</button>
        <button type="button" onClick={() => emit(hour12, minute, true)} className={toggleClass(isPM)}>PM</button>
      </div>
    </div>
  );
}
