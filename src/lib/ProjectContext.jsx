import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Global selected-project state. projectId === null means "All projects"
// (the cross-project portfolio view). Persisted across reloads.
const ProjectContext = createContext(null)
const STORAGE_KEY = 'turquoise.projectId'

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(() => {
    const v = localStorage.getItem(STORAGE_KEY)
    return v && v !== 'all' ? v : null
  })

  useEffect(() => {
    supabase.from('projects').select('id, name').order('name')
      .then(({ data }) => setProjects(data ?? []))
  }, [])

  function selectProject(id) {
    setProjectId(id)
    localStorage.setItem(STORAGE_KEY, id ?? 'all')
  }

  const current = projects.find(p => p.id === projectId) ?? null

  return (
    <ProjectContext.Provider value={{
      projects,
      projectId,
      projectName: current?.name ?? 'All projects',
      selectProject,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider')
  return ctx
}
