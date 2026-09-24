import { useEffect, useId, useRef, useState } from "react";
import "../styles/filter-select.css";

export type FilterOption = { value: string; label: string };

export default function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({ above: false, height: 280 });
  const selected = Math.max(0, options.findIndex(option => option.value === value));

  function show(next = selected) {
    const bounds = trigger.current?.getBoundingClientRect();
    if (bounds) {
      const below = window.innerHeight - bounds.bottom;
      const above = bounds.top;
      const openAbove = below < 180 && above > below;
      setPlacement({ above: openAbove, height: Math.min(280, Math.max(56, (openAbove ? above : below) - 16)) });
    }
    setActive(next);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    setOpen(false);
    if (option.value !== value) onChange(option.value);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);

  return (
    <div className="filter-select" ref={root} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button
        ref={trigger}
        type="button"
        className="filter-select-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open && options[active] ? `${id}-option-${active}` : undefined}
        data-filtered={value !== options[0]?.value || undefined}
        onClick={() => open ? setOpen(false) : show()}
        onKeyDown={event => {
          if (event.key === "Escape") {
            if (open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
            return;
          }
          if (event.key === "Tab") { setOpen(false); return; }
          if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
            event.preventDefault();
            if (!options.length) return;
            const next = event.key === "Home" ? 0
              : event.key === "End" ? options.length - 1
              : event.key === "ArrowDown" ? (open ? active + 1 : selected + 1) % options.length
              : ((open ? active : selected) - 1 + options.length) % options.length;
            if (open) setActive(next); else show(next);
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) choose(active); else show();
            return;
          }
          if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
            const now = Date.now();
            const text = (now - typeahead.current.at < 700 ? typeahead.current.text : "") + event.key.toLocaleLowerCase();
            typeahead.current = { text, at: now };
            const start = open ? active : selected;
            const find = (prefix: string) => options.findIndex((_, offset) =>
              options[(start + offset + 1) % options.length]?.label.toLocaleLowerCase().startsWith(prefix));
            const offset = find(text) >= 0 ? find(text) : find(event.key.toLocaleLowerCase());
            if (offset >= 0) {
              event.preventDefault();
              const next = (start + offset + 1) % options.length;
              if (open) setActive(next); else onChange(options[next]!.value);
            }
          }
        }}
      >
        <span>{options[selected]?.label ?? value}</span>
        <svg className="filter-select-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" /></svg>
      </button>
      {open && <div
        id={`${id}-listbox`}
        className={`filter-select-menu${placement.above ? " filter-select-menu-above" : ""}`}
        role="listbox"
        aria-label={label}
        style={{ maxHeight: placement.height }}
      >
        {options.map((option, index) => <div
          key={option.value}
          id={`${id}-option-${index}`}
          role="option"
          aria-selected={option.value === value}
          className={`filter-select-option${index === active ? " is-active" : ""}`}
          onMouseDown={event => event.preventDefault()}
          onClick={() => choose(index)}
        >
          <span>{option.label}</span>
          {option.value === value && <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>}
        </div>)}
      </div>}
    </div>
  );
}
