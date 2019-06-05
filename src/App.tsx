import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Classes, Code, Icon, MenuItem } from '@blueprintjs/core'
import { IItemRendererProps, Omnibar } from '@blueprintjs/select'
import Matcher, { Entry, Range } from './Matcher'
import * as env from './env'
import './App.css'

const StandaloneModeInfo = React.memo(() => {
  if (!env.isStandaloneMode()) {
    return null
  }
  return (
    <li className={Classes.RUNNING_TEXT}>
      独立标签页说明：
      <br />受 chrome 政策限制，扩展不能向部分页面注入代码，quick-jump 已打开独立页面。
    </li>
  )
})

const InitialContent = React.memo(() => (
  <div>
    <ul className={Classes.LIST}>
      <li>输入关键词开始搜索标签页，支持拼音</li>
      <li>
        输入 <Code>h</Code> 或 <Code>history</Code> 搜索历史记录
      </li>
      <li>
        输入 <Code>b</Code> 或 <Code>bookmark</Code> 搜索书签栏
      </li>
      <li>
        输入 <Code>all</Code> 搜索所有地方（标签页、历史记录、书签栏）
      </li>
      <li>再次按下快捷键可以快速选中已输入的文本</li>
      <StandaloneModeInfo />
    </ul>
  </div>
))

function BookmarkPath({ path }: { path: string[] }) {
  const array: ReactNode[] = []
  for (let i = 0; i < path.length - 1; i++) {
    array.push(path[i])
    array.push(<Icon key={`icon-${i}`} icon="caret-right" />)
  }
  array.push(path[path.length - 1])

  return (
    <div>
      <small className={Classes.TEXT_MUTED}>{array}</small>
    </div>
  )
}

const LastVisitTime = React.memo(({ time }: { time: number }) => {
  const now = new Date().valueOf()
  const diff = now - time

  function renderContent() {
    if (diff < 60e3) {
      return '刚刚'
    } else if (diff < 30 * 60e3) {
      return '最近一小时访问过'
    } else if (diff < 86400e3) {
      return '最近一天访问过'
    } else if (diff < 7 * 86400e3) {
      return '最近一周访问过'
    } else {
      return '更早'
    }
  }

  return (
    <div>
      <small className={Classes.TEXT_MUTED}>历史记录：{renderContent()}</small>
    </div>
  )
})

function decorate(str: string, matches: Range[]) {
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
      key={entry.item.itemKey}
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
            {entry.item.type === 'bookmark' && <BookmarkPath path={entry.item.path} />}
            {entry.item.type === 'history' && <LastVisitTime time={entry.item.lastVisitTime} />}
          </div>
          {entry.item.type === 'tab' && entry.item.favIconUrl && (
            <img alt="favicon" src={entry.item.favIconUrl} />
          )}
        </div>
      }
      onClick={handleClick}
    />
  )
}

export default function App() {
  const [items, setItems] = useState<env.Item[]>([])
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
        initialContent={<InitialContent />}
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

  function openQuickJump(items: env.Item[], initQuery: string) {
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
