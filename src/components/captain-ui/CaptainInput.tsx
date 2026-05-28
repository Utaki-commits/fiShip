import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'
import styles from './CaptainInput.module.css'

export type CaptainInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  helperText?: string
}

export function CaptainInput({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: CaptainInputProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const helperId = helperText ? `${inputId}-helper` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined
  const inputClassNames = [styles.input, error ? styles.inputError : undefined, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.field}>
      {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={inputClassNames}
        id={inputId}
        {...props}
      />
      {error && <div className={styles.errorText} id={errorId}>{error}</div>}
      {!error && helperText && <div className={styles.helperText} id={helperId}>{helperText}</div>}
    </div>
  )
}
