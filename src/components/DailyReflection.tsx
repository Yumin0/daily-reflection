'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, addDays, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

type ReflectionData = {
  id?: string
  date: string
  user: 'yumin' | 'sangyuan'
  score: number
  diet: string[]
  work: string[]
  rest: string[]
  growth: string[]
}

export default function DailyReflection({ initialUser = 'yumin' }: { initialUser?: 'yumin' | 'sangyuan' }) {
  const [date, setDate] = useState<Date>(new Date())
  const [currentUser, setCurrentUser] = useState<'yumin' | 'sangyuan'>(initialUser)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<'yumin' | 'sangyuan' | null>(null)
  const [data, setData] = useState<Record<'yumin' | 'sangyuan', ReflectionData>>({
    yumin: {
      date: format(new Date(), 'yyyy-MM-dd'),
      user: 'yumin',
      score: 3,
      diet: [],
      work: [],
      rest: [],
      growth: [],
    },
    sangyuan: {
      date: format(new Date(), 'yyyy-MM-dd'),
      user: 'sangyuan',
      score: 3,
      diet: [],
      work: [],
      rest: [],
      growth: [],
    },
  })

  const dietItems = ['高蛋白質早餐', '喝夠4000cc的水', '有吃到蔬菜', '額外進食加工食品', '完全無飲食習慣']
  const workItems = ['完成今日課表重點工作', '有至少2小時深度工作', '完成公開演講', '推進了長期目標']
  const restItems = ['真正放鬆後(非滑手機)', '有充分休息', '陪親光滑已經', '個別與飯說點事']
  const growthItems = ['反思子自己', '編寫了新技能', '獲得了新想法', '討出段這個一點', '記下一個好方法改進']

  const dateStr = format(date, 'yyyy-MM-dd')

  useEffect(() => {
    loadData()
  }, [date])

  const loadData = async () => {
    setLoading(true)
    const users: ('yumin' | 'sangyuan')[] = ['yumin', 'sangyuan']
    const newData: Record<'yumin' | 'sangyuan', ReflectionData> = {
      yumin: { date: dateStr, user: 'yumin', score: 3, diet: [], work: [], rest: [], growth: [] },
      sangyuan: { date: dateStr, user: 'sangyuan', score: 3, diet: [], work: [], rest: [], growth: [] },
    }

    for (const user of users) {
      const { data: record } = await supabase
        .from('reflections')
        .select('*')
        .eq('date', dateStr)
        .eq('user', user)
        .maybeSingle()

      if (record) {
        newData[user] = record
      }
    }

    setData(newData)
    setSaved(null)
    setLoading(false)
  }

  const handleCheckbox = (category: keyof Omit<ReflectionData, 'id' | 'date' | 'user' | 'score'>, item: string) => {
    setData(prev => {
      const userData = prev[currentUser]
      const items = userData[category]
      return {
        ...prev,
        [currentUser]: {
          ...userData,
          [category]: items.includes(item) ? items.filter(i => i !== item) : [...items, item],
        },
      }
    })
  }

  const handleSave = async () => {
    setLoading(true)
    const userData = data[currentUser]
    const { data: existing } = await supabase
      .from('reflections')
      .select('id')
      .eq('date', dateStr)
      .eq('user', currentUser)
      .maybeSingle()

    const payload = { ...userData, date: dateStr, user: currentUser }

    if (existing) {
      await supabase.from('reflections').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('reflections').insert([payload])
    }

    setSaved(currentUser)
    setLoading(false)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">今天你過得好嗎？</h1>
          <button className="p-2 hover:bg-gray-200 rounded-lg">⚙️</button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button className="px-4 py-2 bg-gray-700 text-white rounded-full text-sm">今天</button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm">本週</button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm">月度</button>
        </div>

        {/* Date Navigation */}
        <div className="flex justify-between items-center mb-8 text-center">
          <button onClick={() => setDate(subDays(date, 1))} className="text-2xl">‹</button>
          <div className="text-lg font-semibold text-gray-700">
            {format(date, 'M月d日·EEEE', { locale: zhCN })}
          </div>
          <button onClick={() => setDate(addDays(date, 1))} className="text-2xl">›</button>
        </div>

        {/* User Selection Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setCurrentUser('yumin')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              currentUser === 'yumin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🌽 玉米的分數
          </button>
          <button
            onClick={() => setCurrentUser('sangyuan')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              currentUser === 'sangyuan'
                ? 'bg-pink-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🌿 三元的分數
          </button>
        </div>

        {/* Daily Score */}
        <div className="bg-white rounded-xl p-8 mb-6 text-center shadow-sm">
          <div className="text-gray-500 text-sm mb-2">
            {currentUser === 'yumin' ? '🌽的' : '🌿的'}今日點數
          </div>
          <div className="text-6xl font-bold text-gray-800 mb-4">{data[currentUser].score}</div>
          <div className="text-gray-600 text-sm mb-6">
            {currentUser === 'yumin' ? '🌽' : '🌿'}一天的評分
          </div>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setData(prev => ({ ...prev, [currentUser]: { ...prev[currentUser], score: n } }))}
                className={`w-10 h-10 rounded-lg font-semibold transition ${
                  data[currentUser].score === n ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        {[
          { title: '飲食', icon: '🍽️', items: dietItems, category: 'diet' as const },
          { title: '工作', icon: '💼', items: workItems, category: 'work' as const },
          { title: '休閒', icon: '🛋️', items: restItems, category: 'rest' as const },
          { title: '自我成長', icon: '✨', items: growthItems, category: 'growth' as const },
        ].map(section => (
          <div key={section.category} className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{section.icon}</span>
                <span className="font-semibold text-gray-800">{section.title}</span>
              </div>
              <span className="text-sm text-gray-500">
                {data[currentUser][section.category].length}/{section.items.length}
              </span>
            </div>
            <div className="space-y-3">
              {section.items.map(item => (
                <label key={item} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={data[currentUser][section.category].includes(item)}
                    onChange={() => handleCheckbox(section.category, item)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span className={data[currentUser][section.category].includes(item) ? 'line-through text-gray-400' : 'text-gray-700'}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 transition mb-4"
        >
          {loading ? '保存中...' : saved === currentUser ? '已保存！' : `保存${currentUser === 'yumin' ? '🌽 玉米的' : '🌿 三元的'}日記`}
        </button>
      </div>
    </div>
  )
}
