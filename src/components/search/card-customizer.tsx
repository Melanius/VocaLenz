'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, BookmarkPlus } from 'lucide-react'
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
import type { WordCardField } from '@/types/database'

const FIELD_LABELS: Record<WordCardField, string> = {
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

export function CardCustomizer() {
  const { preferences, updatePreferences } = useDisplayPreferences()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  // 로컬 state로 관리 (저장 버튼 클릭 전까지 실제 반영 안 함)
  const [localVisible, setLocalVisible] = useState<WordCardField[]>(preferences.visibleFields)
  const [localOrder, setLocalOrder] = useState<WordCardField[]>(preferences.fieldOrder)

  // Sheet 열릴 때 현재 preferences를 로컬에 동기화
  useEffect(() => {
    setLocalVisible(preferences.visibleFields)
    setLocalOrder(preferences.fieldOrder)
  }, [preferences.visibleFields, preferences.fieldOrder])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = localOrder.indexOf(active.id as WordCardField)
    const newIndex = localOrder.indexOf(over.id as WordCardField)
    setLocalOrder(arrayMove(localOrder, oldIndex, newIndex))
  }

  const handleLocalToggle = (field: WordCardField) => {
    setLocalVisible((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    )
  }

  const handleSave = () => {
    updatePreferences({ visibleFields: localVisible, fieldOrder: localOrder })
    analytics.track('card_customize', {
      settings: { visibleFields: localVisible, fieldOrder: localOrder },
    })
    toast({ title: '설정이 저장되었습니다.' })
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="카드 설정">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80">
        <SheetHeader>
          <SheetTitle>카드 표시 설정</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 검색 모드 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">동시 검색 수</Label>
            <SearchModeSelector />
          </div>

          <Separator />

          {/* 자동 단어장 저장 */}
          <div className="flex items-center gap-3 px-1">
            <Checkbox
              id="auto-save-vocab"
              checked={preferences.autoSaveToVocabulary ?? false}
              onCheckedChange={(checked) =>
                updatePreferences({ autoSaveToVocabulary: !!checked })
              }
            />
            <Label
              htmlFor="auto-save-vocab"
              className="text-sm cursor-pointer flex-1 flex items-center gap-2"
            >
              <BookmarkPlus className="h-4 w-4 text-muted-foreground" />
              검색한 단어 자동 단어장 저장
            </Label>
          </div>

          <Separator />

          {/* 필드 토글 + 드래그 정렬 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">표시 항목 (드래그하여 순서 변경)</Label>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {localOrder.map((field) => (
                    <SortableFieldItem
                      key={field}
                      field={field}
                      label={FIELD_LABELS[field]}
                      checked={localVisible.includes(field)}
                      onToggle={() => handleLocalToggle(field)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* 저장 버튼 */}
          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            설정 저장
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SortableFieldItem({
  field,
  label,
  checked,
  onToggle,
}: {
  field: WordCardField
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
  } = useSortable({ id: field })

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
        id={`field-${field}`}
        checked={checked}
        onCheckedChange={onToggle}
      />
      <Label
        htmlFor={`field-${field}`}
        className="text-sm cursor-pointer flex-1"
      >
        {label}
      </Label>
    </div>
  )
}
