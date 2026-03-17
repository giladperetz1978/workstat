import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getDatabase, onValue, ref, set } from 'firebase/database'
import { type WorkStatus, type WorkStatusInput } from './types'

const STORAGE_KEY = 'work-status-pwa-cache-v1'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

const requiredEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_DATABASE_URL',
] as const

const missingEnvKeys = requiredEnvKeys.filter((key) => !import.meta.env[key])

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.databaseURL,
)

export const realtimeDisabledReason =
  missingEnvKeys.length > 0 ? `חסרים משתני סביבה: ${missingEnvKeys.join(', ')}` : ''

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

const normalize = (item: Partial<WorkStatus> & { id: string }): WorkStatus => ({
  id: item.id,
  projectName: item.projectName ?? 'ללא שם פרויקט',
  subProjectName: item.subProjectName ?? 'ללא שם תת-פרויקט',
  topic: item.topic ?? '',
  progress: Math.max(0, Math.min(100, Number(item.progress ?? 0))),
  completedWork: item.completedWork ?? '',
  nextStep: item.nextStep ?? '',
  nextStepAt: item.nextStepAt ?? '',
  subProjectEta: item.subProjectEta ?? '',
  projectEta: item.projectEta ?? '',
  comments: item.comments ?? '',
  updatedAt: Number(item.updatedAt ?? Date.now()),
  updatedBy: item.updatedBy ?? 'Unknown',
})

const readLocal = (): WorkStatus[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSeed))
      return defaultSeed
    }

    const parsed = JSON.parse(raw) as WorkStatus[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
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

let db = null as ReturnType<typeof getDatabase> | null

if (hasFirebaseConfig) {
  const app = initializeApp(firebaseConfig)
  db = getDatabase(app)
}

export const isRealtimeEnabled = hasFirebaseConfig

export const subscribeStatuses = (onData: (items: WorkStatus[]) => void) => {
  const local = readLocal()
  onData(local)

  if (!db) {
    return () => {
      onData(readLocal())
    }
  }

  const statusesRef = ref(db, 'workStatuses')

  return onValue(
    statusesRef,
    (snapshot) => {
      const value = snapshot.val() as Record<string, Partial<WorkStatus>> | null

      if (!value || Object.keys(value).length === 0) {
        return
      }

      const remote = Object.entries(value).map(([id, data]) =>
        normalize({
          id,
          ...data,
        }),
      )

      saveLocal(remote)
      onData(sortByUpdate(remote))
    },
    () => {
      onData(readLocal())
    },
  )
}

export const upsertStatus = async (input: WorkStatusInput, id?: string) => {
  const recordId = id ?? crypto.randomUUID()
  const record: WorkStatus = {
    ...input,
    id: recordId,
    updatedAt: Date.now(),
  }

  const current = readLocal()
  const next = [record, ...current.filter((item) => item.id !== record.id)]
  saveLocal(next)

  if (!db) return

  await set(ref(db, `workStatuses/${record.id}`), record)
}

