'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, addDays, subDays } from 'date-fns'

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

const USER_CONFIG = {
  yumin: {
    label: '玉米',
    icon: '🌽',
    primary: '#FF8B4D',
    gradient: 'linear-gradient(135deg, #FF8B4D 0%, #FF6B35 100%)',
    shadow: 'rgba(255,139,77,0.4)',
    shadowLight: 'rgba(255,139,77,0.3)',
  },
  sangyuan: {
    label: '三元',
    icon: '🌿',
    primary: '#45D4C4',
    gradient: 'linear-gradient(135deg, #45D4C4 0%, #2BB8A8 100%)',
    shadow: 'rgba(69,212,196,0.4)',
    shadowLight: 'rgba(69,212,196,0.3)',
  },
}

const CHECKLIST_ITEMS = {
  diet: ['高蛋白質早餐', '喝夠4000cc的水', '有吃到蔬菜', '額外進食加工食品', '完全無飲食習慣'],
  work: ['完成今日課表重點工作', '有至少2小時深度工作', '完成公開演講', '推進了長期目標'],
  rest: ['真正放鬆(非滑手機)', '有充分休息', '陪伴彼此', '與朋友聚會'],
  growth: ['反思了自己', '學習了新技能', '獲得了新想法', '突破了一點', '記下一個好方法改進'],
}

const SECTIONS = [
  { title: '飲食', icon: '🍽️', category: 'diet' as const },
  { title: '工作', icon: '💼', category: 'work' as const },
  { title: '休閒', icon: '🛋️', category: 'rest' as const },
  { title: '自我成長', icon: '✨', category: 'growth' as const },
]

const defaultRecord = (user: 'yumin' | 'sangyuan', date: string): ReflectionData => ({
  date, user, score: 3, diet: [], work: [], rest: [], growth: [],
})

function CheckSVG() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
      <path d="M1 5.5L5 9.5L13 1.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UserCard({
  userKey, data, loading, saved,
  onCheckbox, onScore, onSave,
}: {
  userKey: 'yumin' | 'sangyuan'
  data: ReflectionData
  loading: boolean
  saved: boolean
  onCheckbox: (category: keyof typeof CHECKLIST_ITEMS, item: string) => void
  onScore: (score: number) => void
  onSave: () => void
}) {
  const cfg = USER_CONFIG[userKey]
  const totalPoints = SECTIONS.reduce((sum, s) => sum + data[s.category].length, 0)

  return (
    <div style={{
      backgroundColor: '#2A2B3D',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      border: '1px solid #404152',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '3px', background: cfg.gradient,
      }} />

      {/* User header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: cfg.gradient, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px',
          boxShadow: `0 4px 12px ${cfg.shadow}`,
        }}>
          {cfg.icon}
        </div>
        <h2 style={{
          margin: 0, fontSize: '26px', fontWeight: 700,
          color: '#FFFFFF', letterSpacing: '-0.5px',
        }}>{cfg.label}</h2>
      </div>

      {/* Points + rating card */}
      <div style={{
        backgroundColor: '#363749', borderRadius: '18px',
        padding: '28px', marginBottom: '28px', textAlign: 'center',
        border: '1px solid #404152',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
      }}>
        <p style={{
          margin: '0 0 12px 0', fontSize: '13px', color: '#6B7280',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>今日點數</p>
        <div style={{
          fontSize: '72px', fontWeight: 800, lineHeight: 1,
          letterSpacing: '-2px', marginBottom: '24px',
          background: cfg.gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {totalPoints}
        </div>
        <p style={{
          margin: '0 0 16px 0', fontSize: '13px', color: '#6B7280',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>您一天的評分</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onScore(n)}
              style={{
                width: '54px', height: '54px', border: 'none',
                borderRadius: '14px', fontSize: '20px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s ease',
                fontFamily: 'inherit', color: '#FFF',
                background: data.score === n ? cfg.gradient : '#2A2B3D',
                boxShadow: data.score === n
                  ? `0 4px 12px ${cfg.shadow}`
                  : '0 2px 4px rgba(0,0,0,0.2)',
                transform: data.score === n ? 'scale(1.05)' : 'scale(1)',
                opacity: data.score === n ? 1 : 0.6,
              }}
            >{n}</button>
          ))}
        </div>
      </div>

      {/* Category sections */}
      {SECTIONS.map(section => {
        const items = CHECKLIST_ITEMS[section.category]
        const checked = data[section.category]
        return (
          <div key={section.category} style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '17px', fontWeight: 700, margin: '0 0 14px 0',
              display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF',
            }}>
              <span style={{ fontSize: '20px' }}>{section.icon}</span>
              {section.title}
              <span style={{
                marginLeft: 'auto', fontSize: '13px', color: '#6B7280',
                fontWeight: 600, padding: '4px 10px',
                backgroundColor: '#363749', borderRadius: '8px',
              }}>
                {checked.length}/{items.length}
              </span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map(item => {
                const isChecked = checked.includes(item)
                return (
                  <label key={item} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 16px',
                    backgroundColor: isChecked ? '#404152' : '#363749',
                    borderRadius: '14px', cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: `1px solid ${isChecked ? '#404152' : 'transparent'}`,
                    boxShadow: isChecked ? 'inset 0 1px 2px rgba(0,0,0,0.2)' : 'none',
                  }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0,
                      border: `2px solid ${isChecked ? cfg.primary : '#6B7280'}`,
                      backgroundColor: isChecked ? cfg.primary : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: isChecked ? `0 2px 8px ${cfg.shadowLight}` : 'none',
                    }}>
                      {isChecked && <CheckSVG />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onCheckbox(section.category, item)}
                      style={{ display: 'none' }}
                    />
                    <span style={{
                      fontSize: '15px', fontWeight: 500, flex: 1,
                      color: isChecked ? '#9CA3AF' : '#FFFFFF',
                      textDecoration: isChecked ? 'line-through' : 'none',
                    }}>{item}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={loading}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        style={{
          width: '100%', padding: '16px', marginTop: '28px',
          background: cfg.gradient, color: '#FFF', border: 'none',
          borderRadius: '16px', fontSize: '17px', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: `0 6px 20px ${cfg.shadow}`,
          transition: 'all 0.2s ease', letterSpacing: '-0.2px',
          opacity: loading ? 0.5 : 1, fontFamily: 'inherit',
        }}
      >
        {loading ? '保存中...' : saved ? '已保存！' : `保存 ${cfg.label} 的記錄`}
      </button>
    </div>
  )
}

function formatDateHeader(d: Date) {
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日·星期${days[d.getDay()]}`
}

export default function DailyReflection({ initialUser = 'yumin' }: { initialUser?: 'yumin' | 'sangyuan' }) {
  const [date, setDate] = useState<Date>(new Date())
  const [activeUser, setActiveUser] = useState<'yumin' | 'sangyuan'>(initialUser)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<'yumin' | 'sangyuan' | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [data, setData] = useState<Record<'yumin' | 'sangyuan', ReflectionData>>({
    yumin: defaultRecord('yumin', format(new Date(), 'yyyy-MM-dd')),
    sangyuan: defaultRecord('sangyuan', format(new Date(), 'yyyy-MM-dd')),
  })

  const dateStr = format(date, 'yyyy-MM-dd')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const newData: Record<'yumin' | 'sangyuan', ReflectionData> = {
        yumin: defaultRecord('yumin', dateStr),
        sangyuan: defaultRecord('sangyuan', dateStr),
      }
      for (const user of ['yumin', 'sangyuan'] as const) {
        const { data: record } = await supabase
          .from('reflections').select('*')
          .eq('date', dateStr).eq('user', user).maybeSingle()
        if (record) newData[user] = record
      }
      setData(newData)
      setSaved(null)
      setLoading(false)
    }
    loadData()
  }, [dateStr])

  const handleCheckbox = (userKey: 'yumin' | 'sangyuan', category: keyof typeof CHECKLIST_ITEMS, item: string) => {
    setData(prev => {
      const ud = prev[userKey]
      const list = ud[category]
      return {
        ...prev,
        [userKey]: {
          ...ud,
          [category]: list.includes(item) ? list.filter(i => i !== item) : [...list, item],
        },
      }
    })
  }

  const handleScore = (userKey: 'yumin' | 'sangyuan', score: number) => {
    setData(prev => ({ ...prev, [userKey]: { ...prev[userKey], score } }))
  }

  const handleSave = async (userKey: 'yumin' | 'sangyuan') => {
    setLoading(true)
    const ud = data[userKey]
    const { data: existing } = await supabase
      .from('reflections').select('id')
      .eq('date', dateStr).eq('user', userKey).maybeSingle()
    const payload = { ...ud, date: dateStr, user: userKey }
    if (existing) {
      await supabase.from('reflections').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('reflections').insert([payload])
    }
    setSaved(userKey)
    setLoading(false)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#3D3E4E',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: '#FFFFFF',
      padding: isMobile ? '16px' : '24px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{
          fontSize: isMobile ? '24px' : '32px', fontWeight: 700,
          margin: '0 0 8px 0',
        }}>今天你們過得好嗎？</h1>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '16px', margin: '16px 0',
        }}>
          <button
            onClick={() => setDate(d => subDays(d, 1))}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px', color: '#9CA3AF' }}
          >‹</button>
          <span style={{ fontWeight: 500, color: '#9CA3AF', fontSize: '24px' }}>
            {formatDateHeader(date)}
          </span>
          <button
            onClick={() => setDate(d => addDays(d, 1))}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px', color: '#9CA3AF' }}
          >›</button>
        </div>
      </div>

      {/* Mobile tab switcher */}
      {isMobile && (
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '20px',
          backgroundColor: '#2A2B3D', padding: '6px', borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)', border: '1px solid #404152',
        }}>
          {(['yumin', 'sangyuan'] as const).map(user => {
            const cfg = USER_CONFIG[user]
            const isActive = activeUser === user
            return (
              <button
                key={user}
                onClick={() => setActiveUser(user)}
                style={{
                  flex: 1, padding: '14px', border: 'none', borderRadius: '12px',
                  background: isActive ? cfg.gradient : 'transparent',
                  color: '#FFF', fontWeight: 700, fontSize: '16px',
                  cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit',
                  boxShadow: isActive ? `0 4px 12px ${cfg.shadow}` : 'none',
                  opacity: isActive ? 1 : 0.5,
                }}
              >{cfg.label}</button>
            )
          })}
        </div>
      )}

      {/* Main content grid */}
      <div style={{
        display: isMobile ? 'block' : 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {(['yumin', 'sangyuan'] as const).map(userKey => (
          <div key={userKey} style={{ display: isMobile && activeUser !== userKey ? 'none' : 'block' }}>
            <UserCard
              userKey={userKey}
              data={data[userKey]}
              loading={loading}
              saved={saved === userKey}
              onCheckbox={(cat, item) => handleCheckbox(userKey, cat, item)}
              onScore={score => handleScore(userKey, score)}
              onSave={() => handleSave(userKey)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
