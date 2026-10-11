// In-app confirm / message dialogs. Used instead of the browser's confirm() and alert(),
// which some embedded browsers block silently (the button then seems to do nothing).

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './ui'

interface DialogRequest {
  message: string
  confirmLabel?: string // set = confirm dialog with Cancel; unset = message with OK
  resolve: (ok: boolean) => void
}

interface DialogApi {
  /** Ask a yes/no question. Resolves true if confirmed. */
  confirm: (message: string, confirmLabel?: string) => Promise<boolean>
  /** Show a message with an OK button. */
  notify: (message: string) => Promise<void>
}

const DialogContext = createContext<DialogApi>({
  confirm: async () => false,
  notify: async () => {},
})
export const useDialog = () => useContext(DialogContext)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DialogRequest[]>([])
  const current = queue[0]
  const okRef = useRef<HTMLButtonElement>(null)

  const open = useCallback(
    (message: string, confirmLabel?: string) =>
      new Promise<boolean>((resolve) => setQueue((q) => [...q, { message, confirmLabel, resolve }])),
    [],
  )
  const api: DialogApi = {
    confirm: (message, confirmLabel = 'OK') => open(message, confirmLabel),
    notify: async (message) => {
      await open(message)
    },
  }

  const close = (ok: boolean) => {
    current?.resolve(ok)
    setQueue((q) => q.slice(1))
  }

  useEffect(() => {
    if (!current) return
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => close(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-message"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="dialog-message" className="whitespace-pre-line text-slate-800">{current.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              {current.confirmLabel && <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>}
              <Button ref={okRef} variant="primary" onClick={() => close(true)}>{current.confirmLabel ?? 'OK'}</Button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}
