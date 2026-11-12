import { Fragment, type ReactNode } from 'react'

/** Catalog text with <b>bold</b> words, as React nodes. Keeps a whole sentence in one string key. */
export function rich(text: string): ReactNode {
  return text.split(/<b>(.*?)<\/b>/).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>))
}
