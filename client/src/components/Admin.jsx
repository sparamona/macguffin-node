import { useState, useEffect } from 'react'
import './Admin.css'

function Admin({ token }) {
  const [macguffins, setMacguffins] = useState([])
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchMacguffins()
  }, [])

  const fetchMacguffins = async () => {
    try {
      const response = await fetch('/api/macguffins')
      const data = await response.json()
      setMacguffins(data)
    } catch (err) {
      console.error('Failed to fetch macguffins:', err)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName) return

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/macguffins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create macguffin')
        return
      }

      setNewName('')
      fetchMacguffins()
    } catch (err) {
      setError('Failed to create macguffin')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id) => {
    if (!editName) return

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/macguffins/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editName })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update macguffin')
        return
      }

      setEditId(null)
      setEditName('')
      fetchMacguffins()
    } catch (err) {
      setError('Failed to update macguffin')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this macguffin?')) return

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/macguffins/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to delete macguffin')
        return
      }

      fetchMacguffins()
    } catch (err) {
      setError('Failed to delete macguffin')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (macguffin) => {
    setEditId(macguffin.id)
    setEditName(macguffin.name)
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditName('')
  }

  return (
    <div className="admin">
      <h2>Admin Panel</h2>

      {error && <div className="error">{error}</div>}

      <h3>Create Macguffin</h3>
      <form onSubmit={handleCreate}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Macguffin name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading || !newName}>
          {loading ? 'Creating...' : 'Create'}
        </button>
      </form>

      <h3>Manage Macguffins</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {macguffins.map(m => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>
                {editId === m.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                ) : (
                  m.name
                )}
              </td>
              <td>
                {editId === m.id ? (
                  <>
                    <button onClick={() => handleUpdate(m.id)} disabled={loading}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(m)}>Edit</button>
                    <button onClick={() => handleDelete(m.id)} disabled={loading}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Admin

