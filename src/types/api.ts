// API Response types

import type { Word, UserVocabulary, UserScore } from './database'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface WordSearchResponse {
  word: Word
  isInVocabulary: boolean
  userVocabulary?: UserVocabulary | null
}

export interface AIWordGenerationRequest {
  userQuery: string
  difficulty?: number
  count?: number
}

export interface AIWordGenerationResponse {
  words: Word[]
  explanation: string
}

export interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'fill_in_blank' | 'matching'
  question: string
  options?: string[]
  correctAnswer: string
  wordId: string
}

export interface QuizSession {
  id: string
  questions: QuizQuestion[]
  currentQuestionIndex: number
  score: number
  startedAt: string
  completedAt?: string
}

export interface QuizResult {
  session: QuizSession
  userScore: UserScore
  review: {
    question: QuizQuestion
    userAnswer: string
    isCorrect: boolean
  }[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: {
    wordId?: string
    action?: string
  }
}

export interface ChatSession {
  id: string
  userId: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}
