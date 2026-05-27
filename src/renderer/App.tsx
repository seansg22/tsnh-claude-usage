import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { OverviewPage } from './routes/dashboard/OverviewPage'
import { ProjectsPage } from './routes/dashboard/ProjectsPage'
import { ProjectDetailPage } from './routes/dashboard/ProjectDetailPage'
import { SessionDetailPage } from './routes/dashboard/SessionDetailPage'
import { SessionsPage } from './routes/dashboard/SessionsPage'
import { SettingsPage } from './routes/dashboard/SettingsPage'
import { NotificationsPage } from './routes/dashboard/NotificationsPage'
import { MenuBarPage } from './routes/menubar/MenuBarPage'
import { DirectorySetup } from './components/settings/DirectorySetup'
import { useSettingsStore } from './stores/settingsStore'
import { useAnalyticsStore } from './stores/analyticsStore'
import { useCurrencyStore } from './stores/currencyStore'
import { useBudgetNotifications } from './hooks/useBudgetNotifications'

export default function App() {
  const { isConfigured, setBaseDir } = useSettingsStore()
  const { fetchSummary } = useAnalyticsStore()
  const { fetchRates } = useCurrencyStore()
  const [showSetup, setShowSetup] = useState(false)

  // Background budget notification monitor — runs regardless of which page is open
  useBudgetNotifications()

  // Fetch live exchange rates once on startup
  useEffect(() => {
    fetchRates()
  }, [])

  // On first load, check if we need to show setup
  useEffect(() => {
    if (!isConfigured) {
      setShowSetup(true)
    }
  }, [])

  const handleSetupComplete = () => {
    setShowSetup(false)
    // Trigger data load
    const { baseDir } = useSettingsStore.getState()
    if (baseDir) fetchSummary(baseDir)
  }

  return (
    <>
      {showSetup && <DirectorySetup onComplete={handleSetupComplete} />}
      <Routes>
        {/* Menu bar route */}
        <Route path="/menubar" element={<MenuBarPage />} />

        {/* Dashboard routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectDirName" element={<ProjectDetailPage />} />
          <Route
            path="projects/:projectDirName/sessions/:sessionId"
            element={<SessionDetailPage />}
          />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}
