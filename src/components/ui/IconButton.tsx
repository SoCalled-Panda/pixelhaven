import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  /**
   * Required accessible label — icon-only controls must always be labelled
   * (checklist §E) and it doubles as the native tooltip.
   */
  label: string;
  /** Visual "selected tool" state. */
  active?: boolean;
  /** Rendered as aria-pressed for toggle semantics. */
  pressed?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, active = false, pressed, className, type, ...rest },
  ref,
) {
  const classes = ['icon-btn'];
  if (active) classes.push('icon-btn--active');
  if (className) classes.push(className);

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={classes.join(' ')}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      {...rest}
    >
      {icon}
    </button>
  );
});
