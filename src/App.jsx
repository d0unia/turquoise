import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import { ProjectProvider } from './lib/ProjectContext.jsx'
import Login from './views/Login.jsx'
import About from './views/About.jsx'
import Actions from './views/Actions.jsx'
import Analysis from './views/Analysis.jsx'
import Competitive from './views/Competitive.jsx'
import Brief from './views/Brief.jsx'
import Guide from './views/Guide.jsx'
import Members from './views/admin/Members.jsx'
import Secrets from './views/admin/Secrets.jsx'

function Placeholder({ name }) {
  return (
    <div style={{ padding: 32, color: '#888780', fontSize: 13 }}>
      {name} — coming soon
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/about" element={<About />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <ProjectProvider>
              <Layout />
            </ProjectProvider>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/guide" replace />} />
        <Route path="actions"     element={<Actions />} />
        <Route path="analysis"    element={<Analysis />} />
        <Route path="competitive" element={<Competitive />} />
        <Route path="brief"       element={<Brief />} />
        <Route path="guide"       element={<Guide />} />
        <Route path="admin">
          <Route path="members"   element={<Members />} />
          <Route path="secrets"   element={<Secrets />} />
        </Route>
      </Route>
    </Routes>
  )
}
