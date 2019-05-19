import { Callout, Classes, MenuItem } from '@blueprintjs/core'
import { IItemRendererProps, Omnibar } from '@blueprintjs/select'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as Fuse from 'fuse.js'
import * as env from './env'
import './App.css'

type Tab = chrome.tabs.Tab

type FuseItem = {
  item: Tab
  matches: Array<{
    arrayIndex: number
    indices: Array<[number, number]>
    key: string
    value: string
  }>
}

function mark(str: string, indices: Array<[number, number]>) {
  if (indices == null || indices.length === 0) {
    return str
  }
  const lens = indices.map(([start, end]) => end - start + 1)
  const maxLen = Math.max(...lens)

  let t = 0
  let result: React.ReactNode[] = []
  // fuse.js 返回的 end 是 inclusive 的，我们在用的时候需要 +1 使其变为 exclusive
  for (const [start, end] of indices) {
    const len = end + 1 - start
    // 不渲染过短的匹配项
    if (len < Math.ceil(maxLen / 2)) {
      continue
    }
    if (t < start) {
      result.push(<span key={t}>{str.substring(t, start)}</span>)
    }
    result.push(<em key={start}>{str.substring(start, end + 1)}</em>)
    t = end + 1
  }
  if (t < str.length) {
    result.push(<span key={t}>{str.substring(t)}</span>)
  }
  return result
}

const itemRenderer = (item: FuseItem, { modifiers, handleClick }: IItemRendererProps) => {
  const matchMap = new Map(item.matches.map(mat => [mat.key, mat.indices]))

  return (
    <MenuItem
      className="fuse-item"
      key={item.item.id}
      active={modifiers.active}
      text={
        <div className="search-item">
          <div>
            <div>{mark(item.item.title, matchMap.get('title'))}</div>
            <small className={Classes.TEXT_MUTED}>{mark(item.item.url, matchMap.get('url'))}</small>
          </div>
          {item.item.favIconUrl ? (
            <img src={item.item.favIconUrl} />
          ) : (
            <div className="placeholder" />
          )}
        </div>
      }
      onClick={handleClick}
    />
  )
}

const fuseOptions = {
  shouldSort: true,
  includeMatches: true,
  tokenize: true,
  threshold: 0.2,
  location: 0,
  distance: 1000,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ['title', 'url'],
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const fuse = useMemo(() => new Fuse(tabs, fuseOptions), [tabs])
  const searchResult: FuseItem[] = useMemo(() => fuse.search(query), [fuse, query]) as any

  useEffect(() => {
    const unsubscribe = env.addOpenQuickJumpCallback(openQuickJump)
    env.signalReadyForQuickJump()
    return unsubscribe
  }, [])

  useEffect(() => {
    if (isOpen) {
      env.setLastQuery(query)
    }
  }, [query, isOpen])

  const [activeItemId, onChangeActiveItemId] = useState<number>(-1)
  const activeItem = searchResult.find(item => item.item.id === activeItemId)
  const inputRef = useRef<HTMLInputElement>()

  return (
    <>
      {env.isStandaloneMode() && (
        <Callout
          className="standalone-info"
          intent="primary"
          title="独立标签页说明"
          icon="info-sign"
        >
          quick-jump 通过向页面注入代码来实现页面内弹框。 受 chrome
          政策限制，拓展不能向部分页面注入代码，quick-jump 已打开独立页面。
        </Callout>
      )}
      <Omnibar
        query={query}
        overlayProps={{ className: env.isStandaloneMode() ? 'env-standalone' : '' }}
        onQueryChange={nextQuery => setQuery(nextQuery)}
        inputProps={{ inputRef: inputRef as any, autoFocus: true }}
        activeItem={activeItem}
        onActiveItemChange={next => {
          if (next == null) {
            onChangeActiveItemId(-1)
          } else {
            onChangeActiveItemId(next.item.id)
          }
        }}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          env.hideContainer()
        }}
        items={searchResult}
        itemRenderer={itemRenderer}
        onItemSelect={item => {
          env.jumpTo(item.item)
          setIsOpen(false)
          env.hideContainer()
        }}
      />
    </>
  )

  function openQuickJump(tabs: Tab[], initQuery: string) {
    if (!isOpen) {
      setIsOpen(true)
      setQuery(initQuery)
    }
    setTabs(tabs)
    requestAnimationFrame(() => {
      inputRef.current.select()
      inputRef.current.focus()
    })
  }
}
