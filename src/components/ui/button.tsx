import type { ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type Props = ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'ghost'; asChild?: boolean };
export function Button({ className, variant = 'primary', asChild, ...props }: Props) {
  const Component = asChild ? Slot : 'button';
  return <Component className={twMerge(clsx('button', `button--${variant}`, className))} {...props} />;
}
