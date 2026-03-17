import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  deleteProject,
  deleteSubProject,
  deleteStatus,
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
  priority: 'medium',
  riskLevel: 'green',
  progress: 0,
  completedWork: '',
  blockers: '',
  nextStep: '',
  nextStepAt: '',
  trrDate: '',
  trialPrepStart: '',
  trialPrepEnd: '',
  trialDate: '',
  subProjectEta: '',
  projectEta: '',
  comments: '',
  updatedBy: currentUser,
}

const DAY_MS = 1000 * 60 * 60 * 24

const parseDateValue = (value: string) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

const formatDateLabel = (value: string) => value || 'לא הוגדר'

function App() {
  const [items, setItems] = useState<WorkStatus[]>([])
  const [form, setForm] = useState<WorkStatusInput>(initialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openProject, setOpenProject] = useState<string | null>(null)
  const [openSubProjectKey, setOpenSubProjectKey] = useState<string | null>(null)

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
      const nextMilestone =
        records
          .flatMap((row) => [row.trrDate, row.trialPrepStart, row.trialPrepEnd, row.trialDate])
          .filter(Boolean)
          .sort()[0] || 'לא הוגדר'
      const riskCount = records.filter((row) => row.riskLevel !== 'green').length

      return {
        name,
        avgProgress: Math.round(avgProgress),
        projectEta,
        nextMilestone,
        riskCount,
      }
    })
  }, [groupedByProject])

  const portfolioMetrics = useMemo(() => {
    const now = Date.now()
    const inTwoWeeks = now + DAY_MS * 14

    const overdueNextSteps = items.filter((item) => {
      const timestamp = parseDateValue(item.nextStepAt)
      return timestamp !== null && timestamp < now
    }).length

    const upcomingTrials = items.filter((item) => {
      const timestamp = parseDateValue(item.trialDate)
      return timestamp !== null && timestamp >= now && timestamp <= inTwoWeeks
    }).length

    const openRisks = items.filter(
      (item) => item.riskLevel === 'red' || item.blockers.trim().length > 0,
    ).length

    const activePreparation = items.filter((item) => {
      const start = parseDateValue(item.trialPrepStart)
      const end = parseDateValue(item.trialPrepEnd)
      if (start === null || end === null) return false
      return start <= now && end >= now
    }).length

    return [
      { label: 'צעדים באיחור', value: overdueNextSteps },
      { label: 'ניסויים ב-14 יום', value: upcomingTrials },
      { label: 'חסמים/סיכון גבוה', value: openRisks },
      { label: 'בהכנה לניסוי', value: activePreparation },
    ]
  }, [items])

  const projectRows = useMemo(() => {
    return Object.entries(groupedByProject)
      .map(([name, records]) => {
        const subProjects = Object.entries(
          records.reduce<Record<string, WorkStatus[]>>((acc, row) => {
            if (!acc[row.subProjectName]) acc[row.subProjectName] = []
            acc[row.subProjectName].push(row)
            return acc
          }, {}),
        )
          .map(([subProjectName, subRecords]) => ({
            subProjectName,
            records: [...subRecords].sort((a, b) => b.updatedAt - a.updatedAt),
            avgProgress: Math.round(
              subRecords.reduce((sum, row) => sum + row.progress, 0) / subRecords.length,
            ),
            lastUpdated: Math.max(...subRecords.map((row) => row.updatedAt)),
          }))
          .sort((a, b) => b.lastUpdated - a.lastUpdated)

        return {
          name,
          totalRows: records.length,
          subProjects,
        }
      })
      .sort((a, b) => {
        const aLast = Math.max(...a.subProjects.map((row) => row.lastUpdated))
        const bLast = Math.max(...b.subProjects.map((row) => row.lastUpdated))
        return bLast - aLast
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
      priority: item.priority,
      riskLevel: item.riskLevel,
      progress: item.progress,
      completedWork: item.completedWork,
      blockers: item.blockers,
      nextStep: item.nextStep,
      nextStepAt: item.nextStepAt,
      trrDate: item.trrDate,
      trialPrepStart: item.trialPrepStart,
      trialPrepEnd: item.trialPrepEnd,
      trialDate: item.trialDate,
      subProjectEta: item.subProjectEta,
      projectEta: item.projectEta,
      comments: item.comments,
      updatedBy: currentUser,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleProject = (projectName: string) => {
    setOpenProject((prev) => {
      const next = prev === projectName ? null : projectName
      if (next !== projectName) {
        setOpenSubProjectKey(null)
      }
      return next
    })
  }

  const toggleSubProject = (projectName: string, subProjectName: string) => {
    const key = `${projectName}__${subProjectName}`
    setOpenSubProjectKey((prev) => (prev === key ? null : key))
  }

  const removeProject = async (projectName: string) => {
    const approved = window.confirm(`למחוק את כל העדכונים של הפרויקט "${projectName}"?`)
    if (!approved) return

    setIsDeleting(true)
    try {
      setItems((prev) => prev.filter((item) => item.projectName !== projectName))
      await deleteProject(projectName)
      setOpenProject((prev) => (prev === projectName ? null : prev))
      setOpenSubProjectKey(null)
      if (
        editingId &&
        items.some((item) => item.id === editingId && item.projectName === projectName)
      ) {
        cancelEdit()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const removeStatus = async (item: WorkStatus) => {
    const approved = window.confirm('למחוק את העדכון הזה?')
    if (!approved) return

    setIsDeleting(true)
    try {
      setItems((prev) => prev.filter((row) => row.id !== item.id))
      await deleteStatus(item.id)
      if (editingId === item.id) {
        cancelEdit()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const removeSubProject = async (projectName: string, subProjectName: string) => {
    const approved = window.confirm(
      `למחוק את כל העדכונים של תת-הפרויקט "${subProjectName}" בפרויקט "${projectName}"?`,
    )
    if (!approved) return

    setIsDeleting(true)
    try {
      setItems((prev) =>
        prev.filter(
          (item) =>
            !(item.projectName === projectName && item.subProjectName === subProjectName),
        ),
      )
      await deleteSubProject(projectName, subProjectName)
      const key = `${projectName}__${subProjectName}`
      setOpenSubProjectKey((prev) => (prev === key ? null : prev))

      if (
        editingId &&
        items.some(
          (item) =>
            item.id === editingId &&
            item.projectName === projectName &&
            item.subProjectName === subProjectName,
        )
      ) {
        cancelEdit()
      }
    } finally {
      setIsDeleting(false)
    }
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
              דחיפות
              <select
                value={form.priority}
                onChange={(e) =>
                  updateField('priority', e.target.value as WorkStatusInput['priority'])
                }
              >
                <option value="low">נמוכה</option>
                <option value="medium">בינונית</option>
                <option value="high">גבוהה</option>
              </select>
            </label>
            <label>
              רמת סיכון
              <select
                value={form.riskLevel}
                onChange={(e) =>
                  updateField('riskLevel', e.target.value as WorkStatusInput['riskLevel'])
                }
              >
                <option value="green">ירוק</option>
                <option value="yellow">צהוב</option>
                <option value="red">אדום</option>
              </select>
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
              חסמים וסיכונים
              <textarea
                value={form.blockers}
                onChange={(e) => updateField('blockers', e.target.value)}
                placeholder="מה מעכב את ההתקדמות?"
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
              תאריך TRR
              <input
                type="date"
                value={form.trrDate}
                onChange={(e) => updateField('trrDate', e.target.value)}
              />
            </label>
            <label>
              תחילת הכנה לניסוי
              <input
                type="date"
                value={form.trialPrepStart}
                onChange={(e) => updateField('trialPrepStart', e.target.value)}
              />
            </label>
            <label>
              סיום הכנה לניסוי
              <input
                type="date"
                value={form.trialPrepEnd}
                onChange={(e) => updateField('trialPrepEnd', e.target.value)}
              />
            </label>
            <label>
              תאריך הניסוי
              <input
                type="date"
                value={form.trialDate}
                onChange={(e) => updateField('trialDate', e.target.value)}
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
          <h2>מדדי מעקב</h2>
          <div className="summary-grid metrics-grid">
            {portfolioMetrics.map((metric) => (
              <article key={metric.label} className="summary-card metric-card">
                <p className="metric-value">{metric.value}</p>
                <p>{metric.label}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>תמונת מצב לפי פרויקט</h2>
          <div className="summary-grid">
            {projectSummary.map((project) => (
              <article key={project.name} className="summary-card">
                <h3>{project.name}</h3>
                <p>ביצוע ממוצע: {project.avgProgress}%</p>
                <p>צפי לסיום פרויקט: {project.projectEta}</p>
                <p>אבן דרך קרובה: {project.nextMilestone}</p>
                <p>תתי-פרויקטים בסיכון: {project.riskCount}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>טבלת פרויקטים ותתי-פרויקטים</h2>
          <div className="projects-table-wrap">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>פרויקט</th>
                  <th>תתי פרויקטים</th>
                  <th>עדכונים</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {projectRows.map((project) => {
                  const isProjectOpen = openProject === project.name
                  return (
                    <Fragment key={project.name}>
                      <tr key={project.name}>
                        <td>
                          <button
                            type="button"
                            className="row-toggle"
                            onClick={() => toggleProject(project.name)}
                          >
                            {isProjectOpen ? '▼' : '▶'} {project.name}
                          </button>
                        </td>
                        <td>{project.subProjects.length}</td>
                        <td>{project.totalRows}</td>
                        <td>
                          <button
                            type="button"
                            className="danger-btn"
                            disabled={isDeleting}
                            onClick={() => removeProject(project.name)}
                          >
                            מחיקת פרויקט
                          </button>
                        </td>
                      </tr>

                      {isProjectOpen && (
                        <tr key={`${project.name}-subs`}>
                          <td colSpan={4}>
                            <div className="subproject-list">
                              {project.subProjects.map((subProject) => {
                                const subKey = `${project.name}__${subProject.subProjectName}`
                                const isSubOpen = openSubProjectKey === subKey

                                return (
                                  <article key={subKey} className="subproject-card">
                                    <button
                                      type="button"
                                      className="subproject-toggle"
                                      onClick={() =>
                                        toggleSubProject(project.name, subProject.subProjectName)
                                      }
                                    >
                                      <span>
                                        {isSubOpen ? '▼' : '▶'} {subProject.subProjectName}
                                      </span>
                                      <span>
                                        {subProject.records.length} עדכונים | {subProject.avgProgress}%
                                      </span>
                                    </button>

                                    <div className="subproject-actions">
                                      <button
                                        type="button"
                                        className="danger-btn"
                                        disabled={isDeleting}
                                        onClick={() =>
                                          removeSubProject(
                                            project.name,
                                            subProject.subProjectName,
                                          )
                                        }
                                      >
                                        מחיקת תת-פרויקט
                                      </button>
                                    </div>

                                    {isSubOpen && (
                                      <div className="feed">
                                        {subProject.records.map((item) => (
                                          <article key={item.id} className="status-card">
                                            <header>
                                              <h3>{item.topic}</h3>
                                              <span>
                                                עודכן: {new Date(item.updatedAt).toLocaleString('he-IL')}
                                              </span>
                                            </header>
                                            <div className="meta-chips">
                                              <span className={`chip priority-${item.priority}`}>
                                                דחיפות: {item.priority === 'high' ? 'גבוהה' : item.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                                              </span>
                                              <span className={`chip risk-${item.riskLevel}`}>
                                                סיכון: {item.riskLevel === 'red' ? 'אדום' : item.riskLevel === 'yellow' ? 'צהוב' : 'ירוק'}
                                              </span>
                                            </div>
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
                                              <strong>TRR:</strong> {formatDateLabel(item.trrDate)}
                                            </p>
                                            <p>
                                              <strong>חלון הכנה לניסוי:</strong>{' '}
                                              {formatDateLabel(item.trialPrepStart)} - {formatDateLabel(item.trialPrepEnd)}
                                            </p>
                                            <p>
                                              <strong>תאריך ניסוי:</strong> {formatDateLabel(item.trialDate)}
                                            </p>
                                            <p>
                                              <strong>צפי תת-פרויקט:</strong> {formatDateLabel(item.subProjectEta)}
                                            </p>
                                            <p>
                                              <strong>צפי פרויקט:</strong> {formatDateLabel(item.projectEta)}
                                            </p>
                                            {item.blockers && (
                                              <p className="blockers-text">
                                                <strong>חסמים:</strong> {item.blockers}
                                              </p>
                                            )}
                                            {item.comments && (
                                              <p
                                                style={{
                                                  fontSize: '0.9rem',
                                                  fontStyle: 'italic',
                                                  color: 'var(--ink-soft)',
                                                }}
                                              >
                                                <strong>הערות:</strong> {item.comments}
                                              </p>
                                            )}
                                            <footer>
                                              <span>מעדכן: {item.updatedBy}</span>
                                              <div className="status-actions">
                                                <button
                                                  type="button"
                                                  className="edit-btn"
                                                  onClick={() => startEdit(item)}
                                                >
                                                  עריכה
                                                </button>
                                                <button
                                                  type="button"
                                                  className="danger-btn"
                                                  disabled={isDeleting}
                                                  onClick={() => removeStatus(item)}
                                                >
                                                  מחיקה
                                                </button>
                                              </div>
                                            </footer>
                                          </article>
                                        ))}
                                      </div>
                                    )}
                                  </article>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

