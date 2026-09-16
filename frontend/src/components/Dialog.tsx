import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import Button from "./Button";

export default function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const previousTitle = useRef(title);
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
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
