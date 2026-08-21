import { useRef, type ChangeEvent } from 'react'

import { useAppConfig } from '@/app/config-context'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORY_REGISTRY } from '@/domain/categories/category-registry'
import { SORT_KEY_LABELS, SORT_KEYS } from '@/domain/sorting/sort-key'
import { STATUS_LABELS, STATUSES } from '@/domain/status/status'
import { THEME_LABELS, THEMES } from '@/domain/theme/theme'
import { useResetDemoDataMutation } from '@/features/demo/hooks/use-reset-demo-data'
import {
  useExportItemsMutation,
  useImportItemsMutation,
} from '@/features/items/hooks/use-items'
import { downloadTextFile } from '@/shared/download-text-file'

import { useSettingsQuery, useUpdateSettingsMutation } from './hooks/use-settings'

function exportFilename(now: Date): string {
  return `backlogs-backup-${now.toISOString().slice(0, 10)}.json`
}

export function SettingsPage() {
  const { isDemo, build } = useAppConfig()
  const { data: settings, isLoading } = useSettingsQuery()
  const updateSettings = useUpdateSettingsMutation()
  const exportItems = useExportItemsMutation()
  const importItems = useImportItemsMutation()
  const resetDemoData = useResetDemoDataMutation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (isLoading || !settings) {
    return <div className="text-muted-foreground p-8 text-sm">Loading…</div>
  }

  function handleExport() {
    exportItems.mutate(undefined, {
      onSuccess: (raw) => {
        downloadTextFile(exportFilename(new Date()), raw, 'application/json')
      },
    })
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    if (
      !window.confirm(
        'Importing a backup replaces your entire current backlog. Continue?',
      )
    ) {
      return
    }
    const text = await file.text()
    importItems.mutate(text)
  }

  function handleResetDemoData() {
    if (
      !window.confirm('Reset the demo backlog to its original sample data. Continue?')
    ) {
      return
    }
    resetDemoData.mutate()
  }

  return (
    <div className="flex max-w-md flex-col gap-8 p-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-foreground text-sm font-semibold">Preferences</h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-theme">Theme</Label>
          <Select
            value={settings.theme}
            onValueChange={(value) => {
              updateSettings.mutate({ theme: value })
            }}
          >
            <SelectTrigger id="settings-theme" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEMES.map((theme) => (
                <SelectItem key={theme} value={theme}>
                  {THEME_LABELS[theme]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-default-sort">Default sort</Label>
          <Select
            value={settings.defaultSort}
            onValueChange={(value) => {
              updateSettings.mutate({ defaultSort: value })
            }}
          >
            <SelectTrigger id="settings-default-sort" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_KEY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-default-category">Default category</Label>
          <Select
            value={settings.defaultCategory}
            onValueChange={(value) => {
              updateSettings.mutate({ defaultCategory: value })
            }}
          >
            <SelectTrigger id="settings-default-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_REGISTRY.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-default-status">Default status</Label>
          <Select
            value={settings.defaultStatus}
            onValueChange={(value) => {
              updateSettings.mutate({ defaultStatus: value })
            }}
          >
            <SelectTrigger id="settings-default-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-foreground text-sm font-semibold">Backup / Restore</h2>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportItems.isPending}
          >
            Export backup
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            disabled={importItems.isPending}
          >
            Import backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            aria-label="Import backup file"
            className="hidden"
            onChange={(event) => {
              void handleFileSelected(event)
            }}
          />
        </div>

        {exportItems.isSuccess && (
          <p className="text-muted-foreground text-xs">Backup downloaded.</p>
        )}
        {importItems.isSuccess && (
          <p className="text-muted-foreground text-xs">
            Imported {importItems.data.itemCount} item(s)
            {importItems.data.warning ? ` — ${importItems.data.warning}` : ''}.
          </p>
        )}
        {importItems.isError && (
          <p className="text-destructive text-xs">
            Import failed. The file could not be read.
          </p>
        )}
      </section>

      {isDemo && (
        <section className="flex flex-col gap-3">
          <h2 className="text-foreground text-sm font-semibold">Demo</h2>
          <p className="text-muted-foreground text-xs">
            Restores the sample backlog and discards anything you have changed in this
            browser.
          </p>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDemoData}
              disabled={resetDemoData.isPending}
            >
              Reset demo data
            </Button>
          </div>
          {resetDemoData.isSuccess && (
            <p className="text-muted-foreground text-xs">
              Reset to {resetDemoData.data.itemCount} sample items.
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-1">
        <h2 className="text-foreground text-sm font-semibold">About</h2>
        <p className="text-muted-foreground text-xs">
          Version {build.version} · build {build.commit}
        </p>
        <p className="text-muted-foreground text-xs">
          Your backlog is stored only in this browser. Nothing is uploaded anywhere.
        </p>
      </section>
    </div>
  )
}
