import { getInputCandidates } from './getPinyin'
import { Item } from './env'

export interface Range {
  start: number
  end: number
}

export interface Entry {
  item: Item
  urlMatches: Range[]
  titleMatches: Range[]
  score: number
}

function sortBy<T>(arr: T[], iteratee: (t: T) => number) {
  return arr.sort((a, b) => iteratee(a) - iteratee(b))
}

function searchUrl(url: string, keyword: string) {
  const idx = url.indexOf(keyword)
  if (idx !== -1) {
    return { start: idx, end: idx + keyword.length }
  } else {
    return null
  }
}

function searchTitle(title: string, keyword: string) {
  const candidates = getInputCandidates(title)
  for (let start = 0; start < candidates.length; start++) {
    let consumed = 0 // keyword 被消费的长度
    nextEnd: for (let end = start; end < candidates.length; end++) {
      const ways = candidates[end]
      for (const way of ways) {
        let len = 0
        while (
          consumed + len < keyword.length &&
          len < way.length &&
          keyword[consumed + len] === way[len]
        ) {
          len++
        }
        if (consumed + len === keyword.length) {
          return { start, end: end + 1 } // 匹配成功
        } else if (len === way.length) {
          consumed += len
          continue nextEnd
        } // else 尝试下一个 way
      }

      // 所有的 way 都尝试了，匹配失败，跳转至 start++
      break
    }
  }
  return null // 匹配失败
}

function dedupeMatches(matches: Range[]) {
  // 按匹配长度降序排序
  const sorted = sortBy(matches.slice(), m => -(m.end - m.start))
  const result: typeof matches = []
  for (const m1 of sorted) {
    let overlapped = false
    for (const m2 of result) {
      if (!(m1.end <= m2.start || m1.start >= m2.end)) {
        overlapped = true
        break
      }
    }
    if (!overlapped) {
      result.push(m1)
    }
  }
  sortBy(result, m => m.start)
  return result
}

export default class Matcher {
  constructor(private items: Item[]) {}

  preprocess(query: string): { defaultShowAll: boolean; keywords: string[]; searchItems: Item[] } {
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
    if (keywords.length === 0) {
      return { defaultShowAll: false, keywords: [], searchItems: [] }
    }
    const [first, ...rest] = keywords
    if (first === 'h' || first === 'history') {
      return {
        defaultShowAll: true,
        keywords: rest,
        searchItems: this.items.filter(item => item.type === 'history'),
      }
    } else if (first === 'b' || first === 'bookmark') {
      return {
        defaultShowAll: true,
        keywords: rest,
        searchItems: this.items.filter(item => item.type === 'bookmark'),
      }
    } else if (first === 'all') {
      return {
        defaultShowAll: false,
        keywords: rest,
        searchItems: this.items,
      }
    } else {
      return {
        defaultShowAll: false,
        keywords,
        searchItems: this.items.filter(item => item.type === 'tab'),
      }
    }
  }

  search(query: string) {
    const result: Entry[] = []
    const { keywords, searchItems, defaultShowAll } = this.preprocess(query)

    if (defaultShowAll && keywords.length === 0) {
      for (const item of searchItems) {
        result.push({ score: 1, item, titleMatches: [], urlMatches: [] })
      }
      return result
    }

    for (const item of searchItems) {
      const entry: Entry = {
        item,
        titleMatches: [],
        urlMatches: [],
        score: 0,
      }
      for (const keyword of keywords) {
        const titleMatch = searchTitle(item.title, keyword)
        if (titleMatch) {
          entry.titleMatches.push(titleMatch)
        }

        const urlMatch = searchUrl(item.url, keyword)
        if (urlMatch) {
          entry.urlMatches.push(urlMatch)
        }
      }

      entry.titleMatches = dedupeMatches(entry.titleMatches)
      entry.urlMatches = dedupeMatches(entry.urlMatches)

      entry.score = entry.titleMatches.length * 2 + entry.urlMatches.length
      if (entry.item.type === 'tab') {
        entry.score *= 2
      }

      if (entry.score > 0) {
        result.push(entry)
      }
    }

    sortBy(result, entry => -entry.score)

    return result
  }
}
