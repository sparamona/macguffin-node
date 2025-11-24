import { useState, useEffect } from 'react'
import './Dashboard.css'

function Dashboard({ token, onInventoryChange }) {
  const [inventory, setInventory] = useState([])
  const [macguffins, setMacguffins] = useState([])
  const [selectedMacguffin, setSelectedMacguffin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInventory()
    fetchMacguffins()
  }, [])

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/user/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setInventory(data)
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
    }
  }

  const fetchMacguffins = async () => {
    try {
      const response = await fetch('/api/macguffins')
      const data = await response.json()
      setMacguffins(data)
    } catch (err) {
      console.error('Failed to fetch macguffins:', err)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!selectedMacguffin) return

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/user/inventory', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ macguffin_id: parseInt(selectedMacguffin) })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add macguffin')
        return
      }

      setSelectedMacguffin('')
      fetchInventory()
      if (onInventoryChange) {
        onInventoryChange()
      }
    } catch (err) {
      setError('Failed to add macguffin')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <h2>My Inventory</h2>
      
      {inventory.length === 0 ? (
        <p className="empty-message">No macguffins yet</p>
      ) : (
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Macguffin</th>
              <th>Found</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => (
              <tr key={item.id}>
                <td>{item.macguffin_name}</td>
                <td>{new Date(item.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Add Macguffin</h3>
      <form onSubmit={handleAdd}>
        {error && <div className="error">{error}</div>}
        
        <div className="form-group">
          <select
            value={selectedMacguffin}
            onChange={(e) => setSelectedMacguffin(e.target.value)}
            required
          >
            <option value="">Select a macguffin...</option>
            {macguffins.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading || !selectedMacguffin}>
          {loading ? 'Adding...' : 'Add to Inventory'}
        </button>
      </form>
    </div>
  )
}

export default Dashboard

