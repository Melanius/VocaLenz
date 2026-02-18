const ADJECTIVES = [
  '용감한', '빛나는', '똑똑한', '성실한', '활발한', '차분한', '열정적인',
  '재빠른', '지혜로운', '다정한', '느긋한', '씩씩한', '명랑한', '꼼꼼한',
  '유쾌한', '당당한', '호기심많은', '부지런한', '솔직한', '따뜻한',
  '영리한', '담대한', '쾌활한', '진지한', '유연한', '대범한',
]

const NOUNS = [
  '사자', '독수리', '펭귄', '고래', '여우', '올빼미', '돌고래', '호랑이',
  '판다', '수달', '코알라', '토끼', '강아지', '고양이', '다람쥐', '햄스터',
  '단어왕', '독서가', '탐험가', '모험가', '학습자', '도전자',
]

export function generateRandomNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}${noun}${num}`
}
