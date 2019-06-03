import pinyinDict from './pinyin-dict.json'

const DICT: { [key: string]: string } = pinyinDict

const map = new Map<string, string[]>()

for (const [pinyin, chars] of Object.entries(DICT)) {
  for (const char of chars) {
    if (map.has(char)) {
      // 多音字
      map.get(char).push(pinyin)
    } else {
      map.set(char, [char, pinyin])
    }
  }
}

export function getInputCandidates(str: string) {
  const result: string[][] = []
  for (const char of str) {
    if (map.has(char)) {
      result.push(map.get(char))
    } else {
      result.push([char])
    }
  }

  return result
}
