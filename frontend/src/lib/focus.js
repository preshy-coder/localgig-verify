/** After a failed submit, moves keyboard and screen-reader focus to the first field with a problem. */
export function focusFirstInvalid(container) {
  setTimeout(() => {
    const el = container?.querySelector?.('[aria-invalid="true"]');
    if (el) {
      el.focus({ preventScroll: false });
      el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    }
  }, 0);
}
