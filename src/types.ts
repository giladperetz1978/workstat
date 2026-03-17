export type WorkStatus = {
  id: string
  projectName: string
  subProjectName: string
  topic: string
  progress: number
  completedWork: string
  nextStep: string
  nextStepAt: string
  subProjectEta: string
  projectEta: string
  comments: string
  updatedAt: number
  updatedBy: string
}

export type WorkStatusInput = Omit<WorkStatus, 'id' | 'updatedAt'>
