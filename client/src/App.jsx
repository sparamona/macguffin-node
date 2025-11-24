import { useState } from 'react'
import Leaderboard from './components/Leaderboard'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Admin from './components/Admin'
import './App.css'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [leaderboardKey, setLeaderboardKey] = useState(0)

  const handleLogin = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const refreshLeaderboard = () => {
    setLeaderboardKey(prev => prev + 1)
  }

  return (
    <div className="app">
      <header>
        <h1>Macguffin Tracker</h1>
        {user && (
          <div className="user-info">
            <span>{user.email}</span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
      </header>

      <Leaderboard key={leaderboardKey} />

      {user ? (
        <>
          <Dashboard token={token} onInventoryChange={refreshLeaderboard} />
          {user.is_admin && <Admin token={token} />}
        </>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  )
}

export default App
