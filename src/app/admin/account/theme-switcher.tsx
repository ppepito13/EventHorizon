'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  const isDarkMode = theme === 'dark'

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light')
  }

  return (
    <div className="flex items-center space-x-4 rounded-lg border p-4">
      <div className="flex items-center space-x-2">
        <Sun className={`h-5 w-5 transition-colors ${!isDarkMode ? 'text-primary' : 'text-muted-foreground'}`} />
        <Label htmlFor="theme-switch" className={`transition-colors ${!isDarkMode ? 'text-primary' : 'text-muted-foreground'}`}>
          Light Mode
        </Label>
      </div>
      <Switch
        id="theme-switch"
        checked={isDarkMode}
        onCheckedChange={handleThemeChange}
        aria-label="Toggle theme"
      />
      <div className="flex items-center space-x-2">
         <Moon className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-primary' : 'text-muted-foreground'}`} />
        <Label htmlFor="theme-switch" className={`transition-colors ${isDarkMode ? 'text-primary' : 'text-muted-foreground'}`}>
          Dark Mode
        </Label>
      </div>
    </div>
  )
}
