import type { ButtonHTMLAttributes } from 'react'
import styles from './CaptainButton.module.css'

export type CaptainButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'edit'
export type CaptainButtonSize = 'sm' | 'md' | 'lg'

export type CaptainButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: CaptainButtonVariant
  size?: CaptainButtonSize
}

export function CaptainButton({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: CaptainButtonProps) {
  const classNames = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(' ')

  return <button className={classNames} type={type} {...props} />
}
