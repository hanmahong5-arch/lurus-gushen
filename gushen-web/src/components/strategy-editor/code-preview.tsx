'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CodePreviewProps {
  code: string
  language?: string
  isLoading?: boolean
}

export function CodePreview({ code, language = 'python', isLoading = false }: CodePreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-sm font-medium text-white">
            生成的代码 / Generated Code
          </span>
          <span className="px-2 py-0.5 text-xs bg-profit/20 text-profit rounded">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          disabled={!code || isLoading}
          className={cn(
            'px-3 py-1 text-xs rounded transition',
            copied
              ? 'bg-profit/20 text-profit'
              : 'bg-white/10 hover:bg-white/20 text-white/70'
          )}
        >
          {copied ? '已复制 ✓' : '复制代码'}
        </button>
      </div>

      {/* Code area */}
      <div className="relative">
        {isLoading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-sm text-white/50">AI 正在生成策略代码...</span>
            </div>
          </div>
        ) : code ? (
          <pre className="p-4 overflow-x-auto max-h-[400px] overflow-y-auto">
            <code className="text-sm font-mono text-profit/90 leading-relaxed">
              {code}
            </code>
          </pre>
        ) : (
          <div className="p-6 text-center">
            <p className="text-white/40">
              输入策略描述后，AI 将在此处生成对应的 Python 代码
            </p>
            <p className="text-sm text-white/30 mt-1">
              Enter a strategy description to generate Python code here
            </p>
          </div>
        )}

        {/* Line numbers (decorative) */}
        {code && !isLoading && (
          <div className="absolute left-0 top-0 bottom-0 w-10 bg-primary/30 border-r border-border flex flex-col items-end pr-2 pt-4 text-xs text-white/20 font-mono">
            {code.split('\n').map((_, i) => (
              <span key={i} className="leading-relaxed">
                {i + 1}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
