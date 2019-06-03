import { Callout, Classes, MenuItem } from '@blueprintjs/core'
import { IItemRendererProps, Omnibar } from '@blueprintjs/select'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as env from './env'
import './App.css'
import Matcher, { Entry } from './Matcher'
import { Item } from './env'

function decorate(str: string, matches: Array<{ start: number; end: number }>) {
  if (matches == null || matches.length === 0) {
    return str
  }

  let t = 0
  let result: React.ReactNode[] = []
  for (const { start, end } of matches) {
    if (t < start) {
      result.push(<span key={t}>{str.substring(t, start)}</span>)
    }
    result.push(<em key={start}>{str.substring(start, end)}</em>)
    t = end
  }
  if (t < str.length) {
    result.push(<span key={t}>{str.substring(t)}</span>)
  }
  return result
}

const itemRenderer = (entry: Entry, { modifiers, handleClick }: IItemRendererProps) => {
  return (
    <MenuItem
      key={entry.item.id}
      active={modifiers.active}
      text={
        <div className="search-item">
          <div className="left-part">
            <div className="search-item-title">
              {decorate(entry.item.title, entry.titleMatches)}
            </div>
            <small className={Classes.TEXT_MUTED}>
              {decorate(entry.item.url, entry.urlMatches)}
            </small>
          </div>
          {entry.item.type === 'tab' && entry.item.favIconUrl ? (
            <img src={entry.item.favIconUrl} />
          ) : (
            <div className="placeholder" />
          )}
        </div>
      }
      onClick={handleClick}
    />
  )
}

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const matcher = useMemo(() => new Matcher(items), [items])
  const searchResult = useMemo(() => matcher.search(query), [matcher, query])

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

  const [activeItemKey, onChangeActiveItemKey] = useState<string>(null)
  const activeItem = searchResult.find(entry => entry.item.itemKey === activeItemKey)
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
        onActiveItemChange={entry => {
          if (entry == null) {
            onChangeActiveItemKey(null)
          } else {
            onChangeActiveItemKey(entry.item.itemKey)
          }
        }}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          env.hideContainer()
        }}
        items={searchResult}
        itemRenderer={itemRenderer}
        onItemSelect={entry => {
          env.jumpTo(entry.item)
          setIsOpen(false)
          env.hideContainer()
        }}
      />
    </>
  )

  function openQuickJump(items: Item[], initQuery: string) {
    if (!isOpen) {
      setIsOpen(true)
      setQuery(initQuery)
    }
    setItems(items)
    requestAnimationFrame(() => {
      inputRef.current.select()
      inputRef.current.focus()
    })
  }
}
