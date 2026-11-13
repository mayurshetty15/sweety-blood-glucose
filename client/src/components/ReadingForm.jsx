import { LoaderCircle, Save } from 'lucide-react'
import { useState } from 'react'
import { getLocalDateValue, TIME_SLOTS } from '../utils/readingUtils.js'

function ReadingForm({
  initialDate,
  initialValue,
  isSubmitting,
  idPrefix = 'reading',
  submitLabel = 'Save reading',
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(() => ({
    reading_date: initialValue?.reading_date || initialDate || getLocalDateValue(),
    time_slot: initialValue?.time_slot || '',
    value: initialValue?.value == null ? '' : String(initialValue.value),
  }))
  const [errors, setErrors] = useState({})
  const dateId = `${idPrefix}-date`
  const timeSlotId = `${idPrefix}-time-slot`
  const valueId = `${idPrefix}-value`

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    const nextErrors = {}
    const today = getLocalDateValue()
    if (!form.reading_date) {
      nextErrors.reading_date = 'Choose a reading date.'
    } else if (form.reading_date > today) {
      nextErrors.reading_date = 'Reading date cannot be in the future.'
    }

    if (!TIME_SLOTS.some((slot) => slot.value === form.time_slot)) {
      nextErrors.time_slot = 'Choose a time slot.'
    }

    if (!form.value) {
      nextErrors.value = 'Enter a glucose value.'
    } else if (!/^\d+$/.test(form.value)) {
      nextErrors.value = 'Glucose value must be a whole number.'
    } else {
      const glucoseValue = Number(form.value)
      if (glucoseValue < 40 || glucoseValue > 600) {
        nextErrors.value = 'Enter a value between 40 and 600 mg/dL.'
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit({
      reading_date: form.reading_date,
      time_slot: form.time_slot,
      value: Number(form.value),
    })
  }

  return (
    <form className="reading-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="reading-form__fields" disabled={isSubmitting}>
        <div className="form-field">
          <label className="form-label" htmlFor={dateId}>Reading date</label>
          <input
            className={`text-control${errors.reading_date ? ' has-error' : ''}`}
            id={dateId}
            name="reading_date"
            type="date"
            value={form.reading_date}
            max={getLocalDateValue()}
            onChange={(event) => updateField('reading_date', event.target.value)}
            aria-invalid={Boolean(errors.reading_date)}
            aria-describedby={errors.reading_date ? `${dateId}-error` : undefined}
            required
          />
          {errors.reading_date && (
            <span className="field-error" id={`${dateId}-error`} role="alert">
              {errors.reading_date}
            </span>
          )}
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor={timeSlotId}>Time slot</label>
          <select
            className={`text-control select-control${errors.time_slot ? ' has-error' : ''}`}
            id={timeSlotId}
            name="time_slot"
            value={form.time_slot}
            onChange={(event) => updateField('time_slot', event.target.value)}
            aria-invalid={Boolean(errors.time_slot)}
            aria-describedby={errors.time_slot ? `${timeSlotId}-error` : undefined}
            required
          >
            <option value="">Select a time slot</option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>{slot.label}</option>
            ))}
          </select>
          {errors.time_slot && (
            <span className="field-error" id={`${timeSlotId}-error`} role="alert">
              {errors.time_slot}
            </span>
          )}
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor={valueId}>
            Glucose value <span className="form-label__unit">(mg/dL)</span>
          </label>
          <input
            className={`text-control${errors.value ? ' has-error' : ''}`}
            id={valueId}
            name="value"
            type="number"
            inputMode="numeric"
            min="40"
            max="600"
            step="1"
            value={form.value}
            onChange={(event) => updateField('value', event.target.value)}
            aria-invalid={Boolean(errors.value)}
            aria-describedby={errors.value ? `${valueId}-error` : undefined}
            required
          />
          {errors.value && (
            <span className="field-error" id={`${valueId}-error`} role="alert">
              {errors.value}
            </span>
          )}
          <span className="form-hint">Enter a whole number from 40 to 600.</span>
        </div>
      </fieldset>

      <div className="reading-form__actions">
        {onCancel && (
          <button
            className="secondary-button"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button className="primary-button reading-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? <LoaderCircle className="button-spinner" size={18} aria-hidden="true" />
            : <Save size={17} aria-hidden="true" />}
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default ReadingForm
