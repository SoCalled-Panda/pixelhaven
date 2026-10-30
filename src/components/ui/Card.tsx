import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover elevation + pointer cursor (use when the card is clickable). */
  interactive?: boolean;
}

export function Card({ interactive = false, className, ...rest }: CardProps) {
  const classes = ['card'];
  if (interactive) classes.push('card--interactive');
  if (className) classes.push(className);
  return <div className={classes.join(' ')} {...rest} />;
}
