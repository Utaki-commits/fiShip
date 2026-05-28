import type { HTMLAttributes } from 'react'
import styles from './CaptainCard.module.css'

export type CaptainCardVariant = 'default' | 'outlined' | 'elevated'

export type CaptainCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CaptainCardVariant
}

export function CaptainCard({
  variant = 'default',
  className,
  ...props
}: CaptainCardProps) {
  const classNames = [styles.card, styles[variant], className]
    .filter(Boolean)
    .join(' ')

  return <div className={classNames} {...props} />
}
