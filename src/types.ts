export type WorkStatus = {
  id: string
  projectName: string
  subProjectName: string
  topic: string
  priority: 'low' | 'medium' | 'high'
  riskLevel: 'green' | 'yellow' | 'red'
  progress: number
  completedWork: string
  blockers: string
  nextStep: string
  nextStepAt: string
  trrDate: string
  trialPrepStart: string
  trialPrepEnd: string
  trialDate: string
  subProjectEta: string
  projectEta: string
  comments: string
  updatedAt: number
  updatedBy: string
}

export type WorkStatusInput = Omit<WorkStatus, 'id' | 'updatedAt'>
