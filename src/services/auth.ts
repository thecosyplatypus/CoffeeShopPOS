import { v4 as uuid } from 'uuid'
import { get, query, run } from './db'
import type { User, UserRole } from '@/types'

const SESSION_KEY = 'coffeeshop-user-id'
let currentUser: User | null = null

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + 'coffeeshop-pos-salt')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function saveSession(user: User): void {
  currentUser = user
  try { localStorage.setItem(SESSION_KEY, user.id) } catch {}
}

export function clearSession(): void {
  currentUser = null
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}

export function restoreSession(): User | null {
  if (currentUser) return currentUser
  try {
    const id = localStorage.getItem(SESSION_KEY)
    if (!id) return null
    const user = get<User>('SELECT * FROM users WHERE id = ?', [id])
    if (user) {
      currentUser = user
      return user
    }
    localStorage.removeItem(SESSION_KEY)
  } catch {}
  return null
}

export async function hasAnyUsers(): Promise<boolean> {
  const result = get<{ count: number }>('SELECT COUNT(*) as count FROM users')
  return (result?.count ?? 0) > 0
}

export async function createAdmin(name: string, pin: string): Promise<User> {
  const id = `user_${uuid().slice(0, 8)}`
  const hashedPin = await hashPin(pin)
  run(
    'INSERT INTO users (id, name, role, pin) VALUES (?, ?, ?, ?)',
    [id, name, 'owner', hashedPin]
  )

  const user = get<User>('SELECT * FROM users WHERE id = ?', [id])
  if (!user) throw new Error('Failed to create admin user')
  saveSession(user)
  return user
}

export async function login(pin: string): Promise<User | null> {
  const hashedPin = await hashPin(pin)
  const user = get<User>('SELECT * FROM users WHERE pin = ?', [hashedPin])
  if (user) {
    saveSession(user)
    return user
  }
  return null
}

export function getCurrentUser(): User | null {
  return currentUser
}

export function logout(): void {
  clearSession()
}

export function hasRole(requiredRole: UserRole): boolean {
  if (!currentUser) return false
  const hierarchy: Record<UserRole, number> = { barista: 0, manager: 1, owner: 2 }
  return hierarchy[currentUser.role] >= hierarchy[requiredRole]
}

export function requireRole(requiredRole: UserRole): void {
  if (!hasRole(requiredRole)) {
    throw new Error(`Insufficient permissions. Required: ${requiredRole}`)
  }
}

export function getUsers(): User[] {
  return query<User>('SELECT id, name, role, created_at FROM users ORDER BY name')
}

export async function addUser(name: string, role: UserRole, pin: string): Promise<User> {
  const id = `user_${uuid().slice(0, 8)}`
  const hashedPin = await hashPin(pin)
  run(
    'INSERT INTO users (id, name, role, pin) VALUES (?, ?, ?, ?)',
    [id, name, role, hashedPin]
  )
  const user = get<User>('SELECT * FROM users WHERE id = ?', [id])
  if (!user) throw new Error('Failed to create user')
  return user
}

export function updateUserRole(userId: string, newRole: UserRole): boolean {
  if (!hasRole('owner')) return false
  run('UPDATE users SET role = ? WHERE id = ?', [newRole, userId])
  return true
}
