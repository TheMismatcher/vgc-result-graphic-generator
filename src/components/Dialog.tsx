// In-app confirm / message dialogs. Used instead of the browser's confirm() and alert(),
// which some embedded browsers block silently (the button then seems to do nothing).

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './ui'

interface DialogRequest {
  message: string
  buttons: string[] // left to right; the last is the main (highlighted) one
  cancel: boolean // show a Cancel button too
  resolve: (choice: number | null) => void // index of the button, or null for Cancel/Escape
}

interface DialogApi {
  /** Ask a yes/no question. Resolves true if confirmed. */
  confirm: (message: string, confirmLabel?: string) => Promise<boolean>
  /** Show a message with an OK button. */
  notify: (message: string) => Promise<void>
  /** Ask with several choices (plus Cancel). Resolves the chosen index, or null if cancelled. */
  choose: (message: string, buttons: string[]) => Promise<number | null>
}

const DialogContext = createContext<DialogApi>({
  confirm: async () => false,
  notify: async () => {},
  choose: async () => null,
})
export const useDialog = () => useContext(DialogContext)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<DialogRequest[]>([])
  const current = queue[0]
  const okRef = useRef<HTMLButtonElement>(null)

  const open = useCallback(
    (message: string, buttons: string[], cancel: boolean) =>
      new Promise<number | null>((resolve) => setQueue((q) => [...q, { message, buttons, cancel, resolve }])),
    [],
  )
  const api: DialogApi = {
    confirm: async (message, confirmLabel = 'OK') => (await open(message, [confirmLabel], true)) === 0,
    notify: async (message) => {
      await open(message, ['OK'], false)
    },
    choose: (message, buttons) => open(message, buttons, true),
  }

  const close = (choice: number | null) => {
    current?.resolve(choice)
    setQueue((q) => q.slice(1))
  }

  useEffect(() => {
    if (!current) return
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => close(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-message"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="dialog-message" className="whitespace-pre-line text-slate-800">{current.message}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {current.cancel && <Button variant="ghost" onClick={() => close(null)}>Cancel</Button>}
              {current.buttons.map((label, i) =>
                i === current.buttons.length - 1 ? (
                  <Button key={label} ref={okRef} variant="primary" onClick={() => close(i)}>{label}</Button>
                ) : (
                  <Button key={label} variant="secondary" onClick={() => close(i)}>{label}</Button>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}
