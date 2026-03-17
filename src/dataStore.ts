import { initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { type WorkStatus, type WorkStatusInput } from './types'

const STORAGE_KEY = 'work-status-pwa-cache-v1'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

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

const mapTimestamp = (value: unknown): number => {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return Date.now()
}

let db = null as ReturnType<typeof getFirestore> | null

if (hasFirebaseConfig) {
  const app = initializeApp(firebaseConfig)
  db = getFirestore(app)
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

  const q = query(collection(db, 'workStatuses'), orderBy('updatedAt', 'desc'))

  return onSnapshot(
    q,
    (snapshot) => {
      const remote = snapshot.docs.map((docRef) => {
        const data = docRef.data() as Record<string, unknown>

        return normalize({
          id: docRef.id,
          projectName: String(data.projectName ?? ''),
          subProjectName: String(data.subProjectName ?? ''),
          topic: String(data.topic ?? ''),
          progress: Number(data.progress ?? 0),
          completedWork: String(data.completedWork ?? ''),
          nextStep: String(data.nextStep ?? ''),
          nextStepAt: String(data.nextStepAt ?? ''),
          subProjectEta: String(data.subProjectEta ?? ''),
          projectEta: String(data.projectEta ?? ''),
          updatedAt: mapTimestamp(data.updatedAt),
          updatedBy: String(data.updatedBy ?? 'Unknown'),
        })
      })

      if (remote.length > 0) {
        saveLocal(remote)
        onData(sortByUpdate(remote))
      }
    },
    () => {
      onData(readLocal())
    },
  )
}

export const upsertStatus = async (input: WorkStatusInput) => {
  const record: WorkStatus = {
    ...input,
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
  }

  const current = readLocal()
  const next = [record, ...current.filter((item) => item.id !== record.id)]
  saveLocal(next)

  if (!db) return

  await setDoc(doc(db, 'workStatuses', record.id), {
    ...record,
    updatedAt: serverTimestamp(),
  })
}
