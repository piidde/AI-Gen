import { useId, useRef } from "react";

export default function Tabs<T extends string>({
  label,
  options,
  value,
  onChange,
  panelId,
  className = "",
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  panelId: string;
  className?: string;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className={`tabs ${className}`} role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option}
          ref={(element) => {
            refs.current[index] = element;
          }}
          role="tab"
          id={`${id}-${index}`}
          aria-selected={option === value}
          aria-controls={panelId}
          tabIndex={option === value ? 0 : -1}
          onClick={() => onChange(option)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === "ArrowRight") next = (index + 1) % options.length;
            else if (event.key === "ArrowLeft")
              next = (index + options.length - 1) % options.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = options.length - 1;
            else return;
            event.preventDefault();
            onChange(options[next]!);
            refs.current[next]?.focus();
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
