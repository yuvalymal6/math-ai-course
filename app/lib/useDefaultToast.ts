import { useState, useCallback } from "react";

/**
 * Hook for detecting when slider returns to default value.
 * Returns [showMessage, checkValue] — use checkValue in onChange.
 *
 * Usage:
 *   const [showDefault, checkDefault] = useDefaultToast(10);
 *   <input onChange={e => { setValue(+e.target.value); checkDefault(+e.target.value); }} />
 *   <LabMessage text="חזרת לנתוני התרגיל המקורי 🙂" type="success" visible={showDefault} />
 */
export function useDefaultToast(defaultValue: number, duration = 10000): [boolean, (current: number) => void] {
  const [show, setShow] = useState(false);

  const check = useCallback((current: number) => {
    if (current === defaultValue) {
      setShow(true);
      setTimeout(() => setShow(false), duration);
    } else {
      setShow(false);
    }
  }, [defaultValue, duration]);

  return [show, check];
}

/** Multi-value version for labs with multiple sliders */
export function useDefaultToastMulti(defaults: Record<string, number>, duration = 10000): [boolean, (values: Record<string, number>) => void] {
  const [show, setShow] = useState(false);

  const check = useCallback((values: Record<string, number>) => {
    const allMatch = Object.entries(defaults).every(([k, v]) => values[k] === v);
    if (allMatch) {
      setShow(true);
      setTimeout(() => setShow(false), duration);
    } else {
      setShow(false);
    }
  }, [defaults, duration]);

  return [show, check];
}
