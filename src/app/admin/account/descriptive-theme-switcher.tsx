'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

export function DescriptiveThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center rounded-md bg-secondary p-1 w-fit">
      <Button
        variant={theme === 'light' ? 'default' : 'ghost'}
        onClick={() => setTheme('light')}
        className="w-28 justify-center"
      >
        <Sun className="mr-2 h-4 w-4" />
        Light
      </Button>
      <Button
        variant={theme === 'dark' ? 'default' : 'ghost'}
        onClick={() => setTheme('dark')}
        className="w-28 justify-center"
      >
        <Moon className="mr-2 h-4 w-4" />
        Dark
      </Button>
    </div>
  )
}
