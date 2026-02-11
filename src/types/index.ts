// Common types and interfaces

export * from './database'
export * from './api'

export interface PageProps {
  params: Promise<Record<string, string>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export interface LayoutProps {
  children: React.ReactNode
  params?: Promise<Record<string, string>>
}

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export type MemorizationLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface AuthUser {
  id: string
  email: string
  name?: string | null
  avatar_url?: string | null
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

export type SortOrder = 'asc' | 'desc'

export interface SortConfig {
  field: string
  order: SortOrder
}
