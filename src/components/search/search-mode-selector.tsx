'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useDisplayPreferences } from '@/hooks/use-display-preferences'

export function SearchModeSelector() {
  const { preferences, setSearchMode } = useDisplayPreferences()
  const modes = [1, 2, 3, 4] as const

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {modes.map((mode) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <Button
                variant={preferences.searchMode === mode ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-7 p-0 text-xs"
                onClick={() => setSearchMode(mode)}
              >
                {mode}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{mode === 1 ? '단일 검색' : `${mode}개 동시 검색`}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
