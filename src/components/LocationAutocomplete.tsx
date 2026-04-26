import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type Suggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

interface LocationAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  className,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipFetchRef = useRef(false);

  // Sync external value -> local query (e.g., when form loads async)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced fetch from OpenStreetMap Nominatim (no API key required)
  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=6&q=${encodeURIComponent(
          trimmed,
        )}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed");
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setOpen(true);
        setHighlight(0);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (s: Suggestion) => {
    skipFetchRef.current = true;
    setQuery(s.display_name);
    onChange(s.display_name);
    setOpen(false);
    setSuggestions([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "Start typing a city..."}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-warm">
          <ul className="max-h-72 overflow-y-auto py-1">
            {suggestions.map((s, i) => (
              <li key={s.place_id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors",
                    i === highlight
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent/60",
                  )}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{s.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
