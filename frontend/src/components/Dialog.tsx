import { useEffect, useId, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import Button from "./Button";

function isBackdrop(event: MouseEvent<HTMLDialogElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.target === event.currentTarget && (
    event.clientX < bounds.left || event.clientX > bounds.right ||
    event.clientY < bounds.top || event.clientY > bounds.bottom
  );
}

export default function Dialog({
  title,
  children,
  onClose,
  fallbackFocus,
  closeOnBackdrop = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  fallbackFocus?: () => HTMLElement | null;
  closeOnBackdrop?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const startedOnBackdrop = useRef(false);
  const titleId = useId();
  const previousTitle = useRef(title);
  const currentFallback = useRef(fallbackFocus);
  currentFallback.current = fallbackFocus;
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      // A completed step can disable/remove its opener (e.g. pending checkout).
      if (document.activeElement !== opener) currentFallback.current?.()?.focus();
    };
  }, []);
  useEffect(() => {
    if (previousTitle.current !== title)
      ref.current?.querySelector("h2")?.focus();
    previousTitle.current = title;
  }, [title]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onPointerDown={(event) => {
        startedOnBackdrop.current = closeOnBackdrop && isBackdrop(event);
      }}
      onPointerCancel={() => { startedOnBackdrop.current = false; }}
      onClick={(event) => {
        if (closeOnBackdrop && startedOnBackdrop.current && isBackdrop(event)) onClose();
        startedOnBackdrop.current = false;
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={titleId} tabIndex={-1}>
        {title}
      </h2>
      <div className="dialog-body">{children}</div>
      <div className="dialog-actions">
        <Button className="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </dialog>
  );
}
