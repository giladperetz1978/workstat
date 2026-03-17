import { useEffect, useMemo, useState } from 'react'
import {
  isRealtimeEnabled,
  realtimeDisabledReason,
  subscribeStatuses,
  upsertStatus,
} from './dataStore'
import { type WorkStatus, type WorkStatusInput } from './types'
import './App.css'

const currentUser =
  localStorage.getItem('work-status-user') ||
  (typeof prompt === 'function'
    ? prompt('שם לעדכון סטטוס:')?.trim() || 'משתמש'
    : 'משתמש')

localStorage.setItem('work-status-user', currentUser)

const initialForm: WorkStatusInput = {
  projectName: '',
  subProjectName: '',
  topic: '',
  progress: 0,
  completedWork: '',
  nextStep: '',
  nextStepAt: '',
  subProjectEta: '',
  projectEta: '',
  comments: '',
  updatedBy: currentUser,
}

function App() {
  const [items, setItems] = useState<WorkStatus[]>([])
  const [form, setForm] = useState<WorkStatusInput>(initialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    return subscribeStatuses(setItems)
  }, [])

  const groupedByProject = useMemo(() => {
    return items.reduce<Record<string, WorkStatus[]>>((acc, item) => {
      if (!acc[item.projectName]) acc[item.projectName] = []
      acc[item.projectName].push(item)
      return acc
    }, {})
  }, [items])

  const projectSummary = useMemo(() => {
    const projects = Object.entries(groupedByProject)
    return projects.map(([name, records]) => {
      const avgProgress =
        records.reduce((sum, row) => sum + row.progress, 0) / records.length
      const projectEta =
        records
          .map((row) => row.projectEta)
          .filter(Boolean)
          .sort()[0] || 'לא הוגדר'

      return {
        name,
        avgProgress: Math.round(avgProgress),
        projectEta,
      }
    })
  }, [groupedByProject])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      await upsertStatus(form, editingId ?? undefined)
      setForm({ ...initialForm, updatedBy: currentUser })
      setEditingId(null)
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (item: WorkStatus) => {
    setEditingId(item.id)
    setForm({
      projectName: item.projectName,
      subProjectName: item.subProjectName,
      topic: item.topic,
      progress: item.progress,
      completedWork: item.completedWork,
      nextStep: item.nextStep,
      nextStepAt: item.nextStepAt,
      subProjectEta: item.subProjectEta,
      projectEta: item.projectEta,
      comments: item.comments,
      updatedBy: currentUser,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ ...initialForm, updatedBy: currentUser })
  }

  const updateField = <K extends keyof WorkStatusInput>(
    field: K,
    value: WorkStatusInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="shell" dir="rtl">
      <header className="topbar">
        <div>
          <h1>Work Pulse</h1>
          <p>מערכת עדכון סטטוס פרויקטים בזמן אמת</p>
          {!isRealtimeEnabled && realtimeDisabledReason && (
            <p className="sync-help">{realtimeDisabledReason}</p>
          )}
        </div>
        <span className={`sync ${isRealtimeEnabled ? 'live' : 'local'}`}>
          {isRealtimeEnabled ? 'סנכרון LIVE' : 'מצב מקומי בלבד'}
        </span>
      </header>

      <main className="layout">
        <section className="panel form-panel">
          <h2>{editingId ? 'עריכת עדכון קיים' : 'עדכון מהיר'}</h2>
          <form onSubmit={submit} className="form-grid">
            <label>
              פרויקט
              <input
                required
                value={form.projectName}
                onChange={(e) => updateField('projectName', e.target.value)}
              />
            </label>
            <label>
              תת פרויקט
              <input
                required
                value={form.subProjectName}
                onChange={(e) => updateField('subProjectName', e.target.value)}
              />
            </label>
            <label>
              נושא
              <input
                required
                value={form.topic}
                onChange={(e) => updateField('topic', e.target.value)}
              />
            </label>
            <label>
              אחוז ביצוע
              <input
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(e) => updateField('progress', Number(e.target.value))}
              />
            </label>
            <label className="wide">
              מה בוצע?
              <textarea
                required
                value={form.completedWork}
                onChange={(e) => updateField('completedWork', e.target.value)}
              />
            </label>
            <label className="wide">
              מה המהלך הבא?
              <textarea
                required
                value={form.nextStep}
                onChange={(e) => updateField('nextStep', e.target.value)}
              />
            </label>
            <label>
              מתי המהלך הבא?
              <input
                type="datetime-local"
                value={form.nextStepAt}
                onChange={(e) => updateField('nextStepAt', e.target.value)}
              />
            </label>
            <label>
              צפי לסיום תת פרויקט
              <input
                type="date"
                value={form.subProjectEta}
                onChange={(e) => updateField('subProjectEta', e.target.value)}
              />
            </label>
            <label>
              צפי לסיום פרויקט
              <input
                type="date"
                value={form.projectEta}
                onChange={(e) => updateField('projectEta', e.target.value)}
              />
            </label>
            <label>
              מעדכן
              <input
                value={form.updatedBy}
                onChange={(e) => updateField('updatedBy', e.target.value)}
              />
            </label>
            <label className="wide">
              הערות
              <textarea
                value={form.comments}
                onChange={(e) => updateField('comments', e.target.value)}
                placeholder="הערות חופשיות"
              />
            </label>
            <button disabled={isSaving} type="submit">
              {isSaving
                ? 'שומר...'
                : editingId
                  ? 'שמירת שינויים'
                  : 'שמירת עדכון'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="cancel-btn">
                ביטול עריכה
              </button>
            )}
          </form>
        </section>

        <section className="panel">
          <h2>תמונת מצב לפי פרויקט</h2>
          <div className="summary-grid">
            {projectSummary.map((project) => (
              <article key={project.name} className="summary-card">
                <h3>{project.name}</h3>
                <p>ביצוע ממוצע: {project.avgProgress}%</p>
                <p>צפי לסיום פרויקט: {project.projectEta}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>פיד עדכונים</h2>
          <div className="feed">
            {items.map((item) => (
              <article key={item.id} className="status-card">
                <header>
                  <h3>
                    {item.projectName} / {item.subProjectName}
                  </h3>
                  <span>{item.topic}</span>
                </header>
                <div className="progress">
                  <div style={{ width: `${item.progress}%` }} />
                </div>
                <p>
                  <strong>בוצע:</strong> {item.completedWork}
                </p>
                <p>
                  <strong>המהלך הבא:</strong> {item.nextStep}
                </p>
                <p>
                  <strong>מתי:</strong> {item.nextStepAt || 'לא הוגדר'}
                </p>
                <p>
                  <strong>צפי תת פרויקט:</strong> {item.subProjectEta || 'לא הוגדר'}
                </p>
                <p>
                  <strong>צפי פרויקט:</strong> {item.projectEta || 'לא הוגדר'}
                </p>
                {item.comments && (
                  <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                    <strong>הערות:</strong> {item.comments}
                  </p>
                )}
                <footer>
                  <span>
                    עודכן על ידי {item.updatedBy} ב-
                    {new Date(item.updatedAt).toLocaleString('he-IL')}
                  </span>
                  <button type="button" className="edit-btn" onClick={() => startEdit(item)}>
                    עריכה
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

