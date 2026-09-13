import { useEffect, useRef, useState } from 'react'
import { captureScreenshot } from './screenshot'
import { getBugReportBuffer } from './consoleBuffer'
import type { BugReportConfig } from './types'

export interface BugReportModalProps {
  config: BugReportConfig
  onClose: () => void
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'failed'

/**
 * Screenshot se pořizuje HNED při otevření (ne až při odeslání), ale
 * záměrně TICHO - žádný náhled, žádné hlášení, jestli se povedl nebo ne
 * (viz handleSubmit níž, kde chybějící blob prostě jen znamená, že se
 * report pošle bez screenshotu). Uživatel má vždycky vidět stejnou
 * uklidňující hlášku "stav webu byl zaznamenán" - kdyby věděl, že se
 * screenshot nepovedl, mohl by report radši nepodat, přitom text sám o
 * sobě je pořád k něčemu.
 */
export function BugReportModal({ config, onClose }: BugReportModalProps) {
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null)
  const [description, setDescription] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const active = useRef(true)

  useEffect(() => {
    active.current = true
    captureScreenshot().then((blob) => {
      if (!active.current) return
      setScreenshotBlob(blob)
    })
    return () => {
      active.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || submitState === 'submitting') return
    setSubmitState('submitting')

    try {
      const token = await config.getAccessToken()
      if (!token) {
        setSubmitState('failed')
        return
      }

      const form = new FormData()
      form.set('description', description.trim())
      form.set('pageUrl', window.location.href)
      form.set('appName', config.appName)
      form.set('userAgent', navigator.userAgent)
      form.set('consoleLog', JSON.stringify(getBugReportBuffer()))
      if (screenshotBlob) form.set('screenshot', screenshotBlob, 'screenshot.png')

      const res = await fetch(config.submitUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      if (!res.ok) {
        setSubmitState('failed')
        return
      }

      // vikunjaTaskId chybí = report se sice uložil, ale úkol ve Vikunja
      // nevznikl, takže by ho nikdo neviděl a nikdo by na něj nereagoval -
      // z pohledu uživatele je tohle stejně "nedoručeno", ne poloviční
      // úspěch (viz report-bug edge funkce, delivery_status zůstane 'failed'
      // pro ruční dohledání).
      const body = await res.json().catch(() => ({}))
      setSubmitState(body?.vikunjaTaskId ? 'success' : 'failed')
    } catch {
      setSubmitState('failed')
    }
  }

  const submitting = submitState === 'submitting'
  const done = submitState === 'success' || submitState === 'failed'

  return (
    <div className="db-shell__bugreport-backdrop db-shell__no-screenshot" onClick={onClose}>
      <div
        className="db-shell__bugreport-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Nahlásit chybu"
      >
        <h2 className="db-shell__bugreport-title">Nahlásit chybu</h2>

        {done ? (
          <div className="db-shell__bugreport-done">
            {submitState === 'success' ? (
              <p>Díky, nahlásili jsme to.</p>
            ) : (
              <p className="db-shell__bugreport-warning">
                Zpětnou vazbu se nepodařilo odeslat, kontaktuj správce přímo.
              </p>
            )}
            <button type="button" className="db-shell__bugreport-btn-primary" onClick={onClose}>
              Zavřít
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="db-shell__bugreport-preview">
              <div className="db-shell__bugreport-preview-loading">Stav webu byl zaznamenán.</div>
            </div>

            <label className="db-shell__bugreport-label" htmlFor="bug-report-description">
              Co se stalo?
            </label>
            <textarea
              id="bug-report-description"
              className="db-shell__bugreport-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Popiš krátce, co jsi dělal/a a co se stalo místo toho, co jsi čekal/a…"
              rows={4}
              autoFocus
              required
            />

            <div className="db-shell__bugreport-actions">
              <button type="button" className="db-shell__bugreport-btn-secondary" onClick={onClose} disabled={submitting}>
                Zrušit
              </button>
              <button
                type="submit"
                className="db-shell__bugreport-btn-primary"
                disabled={submitting || !description.trim()}
              >
                {submitting ? 'Odesílám…' : 'Odeslat'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
