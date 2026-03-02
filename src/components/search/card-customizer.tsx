'use client'

import { useState, useEffect } from 'react'
import { useDialogBackButton } from '@/hooks/use-dialog-back-button'
import { Settings, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDisplayPreferences } from '@/hooks/use-display-preferences'
import { useToast } from '@/hooks/use-toast'
import { analytics } from '@/lib/analytics'
import { SearchModeSelector } from './search-mode-selector'
import type { WordCardField, ExpressionCardField } from '@/types/database'

const WORD_FIELD_LABELS: Record<WordCardField, string> = {
  meanings: '한글 뜻',
  description: '한국어 설명',
  description_en: '영어 설명',
  image_text: '연상 이미지',
  teps_point: 'TEPS 포인트',
  synonyms: '유의어',
  antonyms: '반의어',
  paraphrasing: '패러프레이징',
  comparisons: '비교 표현',
  example: '예문',
}

const EXPR_FIELD_LABELS: Record<ExpressionCardField, string> = {
  image_text: '연상 이미지',
  meanings: '한글 뜻',
  description: '뉘앙스 설명',
  context: '사용 상황',
  pronunciation_tip: '발음/연음 팁',
  teps_point: 'TEPS 포인트',
  listening_parts: '출제 파트',
  paraphrasing: '패러프레이징',
  comparisons: '비교 표현',
  example: '예문',
}

type Tab = 'word' | 'expression'

interface CardCustomizerProps {
  /** 외부에서 열림 상태를 제어할 때 사용 */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** 초기 활성 탭 */
  initialTab?: Tab
  /** 검색모드/자동저장 같은 상단 설정 숨김 (단어장에서 사용할 때) */
  hideTopSettings?: boolean
}

export function CardCustomizer({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialTab = 'word',
  hideTopSettings = false,
}: CardCustomizerProps = {}) {
  const { preferences, updatePreferences } = useDisplayPreferences()
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (v: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(v)
    } else {
      setInternalOpen(v)
    }
  }

  // 단어 카드 로컬 상태
  const [localVisible, setLocalVisible] = useState<WordCardField[]>(preferences.visibleFields)
  const [localOrder, setLocalOrder] = useState<WordCardField[]>(preferences.fieldOrder)

  // 청해 구문 카드 로컬 상태
  const [localExprVisible, setLocalExprVisible] = useState<ExpressionCardField[]>(
    preferences.exprVisibleFields ?? []
  )
  const [localExprOrder, setLocalExprOrder] = useState<ExpressionCardField[]>(
    preferences.exprFieldOrder ?? []
  )

  // 뒤로가기 버튼으로 시트 닫기 (Android 대응)
  useDialogBackButton(open, () => setOpen(false))

  // Sheet 열릴 때 initialTab 반영 + preferences 동기화
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
      setLocalVisible(preferences.visibleFields)
      setLocalOrder(preferences.fieldOrder)
      setLocalExprVisible(preferences.exprVisibleFields ?? [])
      setLocalExprOrder(preferences.exprFieldOrder ?? [])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // preferences 외부 변경 시 동기화 (Sheet 닫혀있을 때)
  useEffect(() => {
    if (!open) {
      setLocalVisible(preferences.visibleFields)
      setLocalOrder(preferences.fieldOrder)
      setLocalExprVisible(preferences.exprVisibleFields ?? [])
      setLocalExprOrder(preferences.exprFieldOrder ?? [])
    }
  }, [preferences.visibleFields, preferences.fieldOrder, preferences.exprVisibleFields, preferences.exprFieldOrder, open])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleWordDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localOrder.indexOf(active.id as WordCardField)
    const newIndex = localOrder.indexOf(over.id as WordCardField)
    setLocalOrder(arrayMove(localOrder, oldIndex, newIndex))
  }

  const handleExprDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localExprOrder.indexOf(active.id as ExpressionCardField)
    const newIndex = localExprOrder.indexOf(over.id as ExpressionCardField)
    setLocalExprOrder(arrayMove(localExprOrder, oldIndex, newIndex))
  }

  const handleWordToggle = (field: WordCardField) => {
    setLocalVisible((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    )
  }

  const handleExprToggle = (field: ExpressionCardField) => {
    setLocalExprVisible((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    )
  }

  const handleSave = () => {
    updatePreferences({
      visibleFields: localVisible,
      fieldOrder: localOrder,
      exprVisibleFields: localExprVisible,
      exprFieldOrder: localExprOrder,
    })
    analytics.track('card_customize', {
      settings: {
        visibleFields: localVisible,
        fieldOrder: localOrder,
        exprVisibleFields: localExprVisible,
        exprFieldOrder: localExprOrder,
      },
    })
    toast({ title: '설정이 저장되었습니다.' })
    setOpen(false)
  }

  const sheetContent = (
    <SheetContent className="w-80 overflow-y-auto">
      <SheetHeader>
        <SheetTitle>카드 표시 설정</SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        {!hideTopSettings && (
          <>
            {/* 검색 모드 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">동시 검색 수</Label>
              <SearchModeSelector />
            </div>

            <Separator />

            {/* 자동 단어장 저장 */}
            <div className="flex items-start gap-3 px-1">
              <Checkbox
                id="auto-save-vocab"
                checked={preferences.autoSaveToVocabulary ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ autoSaveToVocabulary: !!checked })
                }
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor="auto-save-vocab"
                  className="text-sm cursor-pointer font-medium"
                >
                  자동 저장 (Voca 리스트 / Lenz 픽)
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">검색 결과를 해당 리스트에 자동 저장</p>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* 탭: 단어 / 청해구문 */}
        <div className="inline-flex items-center rounded-lg bg-muted p-0.5 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('word')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
              activeTab === 'word'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            단어
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('expression')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
              activeTab === 'expression'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            청해구문
          </button>
        </div>

        {/* 필드 토글 + 드래그 정렬 */}
        {activeTab === 'word' ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">표시 항목 (드래그하여 순서 변경)</Label>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleWordDragEnd}
            >
              <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {localOrder.map((field) => (
                    <SortableFieldItem
                      key={field}
                      id={field}
                      label={WORD_FIELD_LABELS[field]}
                      checked={localVisible.includes(field)}
                      onToggle={() => handleWordToggle(field)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-sm font-medium">표시 항목 (드래그하여 순서 변경)</Label>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleExprDragEnd}
            >
              <SortableContext items={localExprOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {localExprOrder.map((field) => (
                    <SortableFieldItem
                      key={field}
                      id={field}
                      label={EXPR_FIELD_LABELS[field]}
                      checked={localExprVisible.includes(field)}
                      onToggle={() => handleExprToggle(field)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* 저장 버튼 */}
        <Button onClick={handleSave} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          설정 저장
        </Button>
      </div>
    </SheetContent>
  )

  if (isControlled) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        {sheetContent}
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="카드 설정">
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      {sheetContent}
    </Sheet>
  )
}

function SortableFieldItem({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string
  label: string
  checked: boolean
  onToggle: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border bg-card ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label={`${label} 순서 변경`}
      >
        ⠿
      </button>
      <Checkbox
        id={`field-${id}`}
        checked={checked}
        onCheckedChange={onToggle}
      />
      <Label
        htmlFor={`field-${id}`}
        className="text-sm cursor-pointer flex-1"
      >
        {label}
      </Label>
    </div>
  )
}
