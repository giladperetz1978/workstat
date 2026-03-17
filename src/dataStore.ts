import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { type WorkStatus, type WorkStatusInput } from './types'

const STORAGE_KEY = 'work-status-pwa-cache-v1'

type WorkStatusRow = {
  id: string
  project_name: string | null
  sub_project_name: string | null
  topic: string | null
  progress: number | null
  completed_work: string | null
  next_step: string | null
  next_step_at: string | null
  sub_project_eta: string | null
  project_eta: string | null
  comments: string | null
  updated_at: number | null
  updated_by: string | null
}

type WorkStatusLike = {
  id: string
  projectName?: string | null
  subProjectName?: string | null
  topic?: string | null
  progress?: number | null
  completedWork?: string | null
  nextStep?: string | null
  nextStepAt?: string | null
  subProjectEta?: string | null
  projectEta?: string | null
  comments?: string | null
  updatedAt?: number | null
  updatedBy?: string | null
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const requiredEnvKeys = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const

const missingEnvKeys = requiredEnvKeys.filter((key) => !import.meta.env[key])

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const realtimeDisabledReason =
  !hasSupabaseConfig
    ? `חסרים משתני סביבה: ${missingEnvKeys.join(', ')}`
    : ''

const defaultSeed: WorkStatus[] = [
  {
    id: 'seed-1',
    projectName: 'אתר לקוח Alpha',
    subProjectName: 'דשבורד מנהלים',
    topic: 'Frontend',
    progress: 45,
    completedWork: 'הוקם בסיס מסכים, ניווט וטבלאות נתונים.',
    nextStep: 'חיבור API להצגת נתונים חיים.',
    nextStepAt: new Date().toISOString().slice(0, 16),
    subProjectEta: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString().slice(0, 10),
    projectEta: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18).toISOString().slice(0, 10),
    comments: 'התקדם טוב, יש כמה bugs קטנים לתיקון.',
    updatedAt: Date.now(),
    updatedBy: 'System',
  },
]

const sortByUpdate = (items: WorkStatus[]) =>
  [...items].sort((a, b) => b.updatedAt - a.updatedAt)

const pad2 = (value: number) => value.toString().padStart(2, '0')

const toDateInput = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return ''
  const raw = value.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''

  const year = parsed.getFullYear()
  const month = pad2(parsed.getMonth() + 1)
  const day = pad2(parsed.getDate())
  return `${year}-${month}-${day}`
}

const toDateTimeLocalInput = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return ''
  const raw = value.trim()

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return raw
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''

  const year = parsed.getFullYear()
  const month = pad2(parsed.getMonth() + 1)
  const day = pad2(parsed.getDate())
  const hours = pad2(parsed.getHours())
  const minutes = pad2(parsed.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const normalize = (item: WorkStatusLike & Partial<WorkStatusRow>): WorkStatus => ({
  id: item.id,
  projectName: item.projectName ?? item.project_name ?? 'ללא שם פרויקט',
  subProjectName: item.subProjectName ?? item.sub_project_name ?? 'ללא שם תת-פרויקט',
  topic: item.topic ?? '',
  progress: Math.max(0, Math.min(100, Number(item.progress ?? 0))),
  completedWork: item.completedWork ?? item.completed_work ?? '',
  nextStep: item.nextStep ?? item.next_step ?? '',
  nextStepAt: toDateTimeLocalInput(item.nextStepAt ?? item.next_step_at),
  subProjectEta: toDateInput(item.subProjectEta ?? item.sub_project_eta),
  projectEta: toDateInput(item.projectEta ?? item.project_eta),
  comments: item.comments ?? '',
  updatedAt: Number(item.updatedAt ?? item.updated_at ?? Date.now()),
  updatedBy: item.updatedBy ?? item.updated_by ?? 'Unknown',
})

const toRow = (item: WorkStatus): WorkStatusRow => ({
  id: item.id,
  project_name: item.projectName,
  sub_project_name: item.subProjectName,
  topic: item.topic,
  progress: item.progress,
  completed_work: item.completedWork,
  next_step: item.nextStep,
  next_step_at: item.nextStepAt || null,
  sub_project_eta: item.subProjectEta || null,
  project_eta: item.projectEta || null,
  comments: item.comments || null,
  updated_at: item.updatedAt,
  updated_by: item.updatedBy,
})

const readLocal = (): WorkStatus[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSeed))
      return defaultSeed
    }

    const parsed = JSON.parse(raw) as WorkStatus[]
    if (!Array.isArray(parsed)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSeed))
      return defaultSeed
    }

    return sortByUpdate(parsed.map((item) => normalize(item)))
  } catch {
    return defaultSeed
  }
}

const saveLocal = (items: WorkStatus[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortByUpdate(items)))
}

let supabase: SupabaseClient | null = null

if (hasSupabaseConfig) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false },
  })
}

export const isRealtimeEnabled = hasSupabaseConfig

export const subscribeStatuses = (onData: (items: WorkStatus[]) => void) => {
  const local = readLocal()
  onData(local)

  if (!supabase) {
    return () => {
      onData(readLocal())
    }
  }

  const syncFromRemote = async () => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('work_statuses')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error || !data) {
      onData(readLocal())
      return
    }

    const remote = data.map((row) => normalize(row as WorkStatusLike & WorkStatusRow))
    saveLocal(remote)
    onData(sortByUpdate(remote))
  }

  void syncFromRemote()

  const channel = supabase
    .channel('work-statuses-feed')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'work_statuses' },
      () => {
        void syncFromRemote()
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void syncFromRemote()
      }
    })

  return () => {
    void supabase?.removeChannel(channel)
  }
}

export const upsertStatus = async (input: WorkStatusInput, id?: string) => {
  const recordId = id ?? crypto.randomUUID()

  const sanitizedInput: WorkStatusInput = {
    ...input,
    nextStepAt: toDateTimeLocalInput(input.nextStepAt),
    subProjectEta: toDateInput(input.subProjectEta),
    projectEta: toDateInput(input.projectEta),
  }

  const record: WorkStatus = {
    ...sanitizedInput,
    id: recordId,
    updatedAt: Date.now(),
  }

  const current = readLocal()
  const next = [record, ...current.filter((item) => item.id !== record.id)]
  saveLocal(next)

  if (!supabase) return

  const { error } = await supabase
    .from('work_statuses')
    .upsert(toRow(record), { onConflict: 'id' })

  if (error) {
    console.error('Supabase upsert failed', error.message)
  }
}

export const deleteStatus = async (id: string) => {
  const current = readLocal()
  const next = current.filter((item) => item.id !== id)
  saveLocal(next)

  if (!supabase) return

  const { error } = await supabase.from('work_statuses').delete().eq('id', id)

  if (error) {
    console.error('Supabase delete status failed', error.message)
  }
}

export const deleteProject = async (projectName: string) => {
  const current = readLocal()
  const next = current.filter((item) => item.projectName !== projectName)
  saveLocal(next)

  if (!supabase) return

  const { error } = await supabase
    .from('work_statuses')
    .delete()
    .eq('project_name', projectName)

  if (error) {
    console.error('Supabase delete project failed', error.message)
  }
}

export const deleteSubProject = async (projectName: string, subProjectName: string) => {
  const current = readLocal()
  const next = current.filter(
    (item) =>
      !(item.projectName === projectName && item.subProjectName === subProjectName),
  )
  saveLocal(next)

  if (!supabase) return

  const { error } = await supabase
    .from('work_statuses')
    .delete()
    .eq('project_name', projectName)
    .eq('sub_project_name', subProjectName)

  if (error) {
    console.error('Supabase delete sub-project failed', error.message)
  }
}

