"use client";

import { forwardRef, type InputHTMLAttributes, type MouseEvent } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Vanligt textfält för datum. Första klicket markerar allt. Nästa drag markerar en del. */
export const DateTextInput = forwardRef<HTMLInputElement, Props>(function DateTextInput(
  { onMouseDown, onFocus, onMouseUp, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      {...props}
      onMouseDown={(event) => {
        if (document.activeElement !== event.currentTarget) {
          event.currentTarget.dataset.selectAll = "1";
        }
        onMouseDown?.(event);
      }}
      onFocus={(event) => {
        event.currentTarget.select();
        onFocus?.(event);
      }}
      onMouseUp={(event: MouseEvent<HTMLInputElement>) => {
        if (event.currentTarget.dataset.selectAll === "1") {
          event.preventDefault();
          delete event.currentTarget.dataset.selectAll;
        }
        onMouseUp?.(event);
      }}
    />
  );
});
