import { useEffect, useRef, useState } from 'react'
import { captureScreenshot } from './screenshot'
import { getBugReportBuffer } from './consoleBuffer'
import type { BugReportConfig } from './types'

export interface BugReportModalProps {
  config: BugReportConfig
  onClose: () => void
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'partial' | 'error'

/**
 * Screenshot se pořizuje HNED při otevření (ne až při odeslání) - uživatel
 * tak vidí přesně to, co appka pošle, ještě než začne psát popis. U
 * interních screenshotů (org-chart, admin obrazovky) je tohle ta skutečná
 * "souhlasím" chvíle, ne formalita.
 */
export function BugReportModal({ config, onClose }: BugReportModalProps) {
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null)
  const [screenshotReady, setScreenshotReady] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const active = useRef(true)

  useEffect(() => {
    active.current = true
    captureScreenshot().then((blob) => {
      if (!active.current) return
      setScreenshotBlob(blob)
      setScreenshotReady(true)
      if (blob) setPreviewUrl(URL.createObjectURL(blob))
    })
    return () => {
      active.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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
    setErrorMessage(null)

    try {
      const token = await config.getAccessToken()
      if (!token) {
        setSubmitState('error')
        setErrorMessage('Nejsi přihlášený/á, zkus to prosím po znovunačtení stránky.')
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
        const body = await res.json().catch(() => null)
        setSubmitState('error')
        setErrorMessage(body?.error ?? `Nahlášení selhalo (HTTP ${res.status})`)
        return
      }

      const body = await res.json().catch(() => ({}))
      setSubmitState(body?.vikunjaTaskId ? 'success' : 'partial')
    } catch (err) {
      setSubmitState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Síťová chyba při odesílání.')
    }
  }

  const submitting = submitState === 'submitting'
  const done = submitState === 'success' || submitState === 'partial'

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
            <p>Díky, nahlásili jsme to.</p>
            {submitState === 'partial' && (
              <p className="db-shell__bugreport-warning">
                Report je uložený, ale založení úkolu ve Vikunja se teď nepovedlo - doděláme to ručně.
              </p>
            )}
            <button type="button" className="db-shell__bugreport-btn-primary" onClick={onClose}>
              Zavřít
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="db-shell__bugreport-preview">
              {!screenshotReady && <div className="db-shell__bugreport-preview-loading">Pořizuji screenshot…</div>}
              {screenshotReady && previewUrl && <img src={previewUrl} alt="Náhled screenshotu" />}
              {screenshotReady && !previewUrl && (
                <div className="db-shell__bugreport-preview-loading">Screenshot se nepovedlo pořídit, report půjde i bez něj.</div>
              )}
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

            {submitState === 'error' && errorMessage && (
              <p className="db-shell__bugreport-warning">{errorMessage}</p>
            )}

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
