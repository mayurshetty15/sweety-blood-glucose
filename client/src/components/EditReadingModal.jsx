import { X } from 'lucide-react'
import { useEffect } from 'react'
import ReadingForm from './ReadingForm.jsx'

function EditReadingModal({ reading, isSubmitting, onClose, onSave }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSubmitting, onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) {
        onClose()
      }
    }}>
      <section
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-reading-heading"
      >
        <div className="edit-modal__heading">
          <div>
            <p className="section-eyebrow">Update entry</p>
            <h2 id="edit-reading-heading">Edit reading</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close edit reading dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <ReadingForm
          initialValue={reading}
          isSubmitting={isSubmitting}
          idPrefix="edit-reading"
          submitLabel="Save changes"
          onSubmit={onSave}
          onCancel={onClose}
        />
      </section>
    </div>
  )
}

export default EditReadingModal
