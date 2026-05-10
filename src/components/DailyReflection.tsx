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

type CategoryConfig = {
  title: string
  icon: string
  items: string[]
}

type ChecklistConfig = {
  diet: CategoryConfig
  work: CategoryConfig
  rest: CategoryConfig
  growth: CategoryConfig
}

const CATEGORIES = ['diet', 'work', 'rest', 'growth'] as const
type CategoryKey = typeof CATEGORIES[number]

const DEFAULT_CONFIG: ChecklistConfig = {
  diet:   { title: '飲食',   icon: '🍽️', items: ['高蛋白質早餐', '喝夠4000cc的水', '有吃到蔬菜', '額外進食加工食品', '完全無飲食習慣'] },
  work:   { title: '工作',   icon: '💼', items: ['完成今日課表重點工作', '有至少2小時深度工作', '完成公開演講', '推進了長期目標'] },
  rest:   { title: '休閒',   icon: '🛋️', items: ['真正放鬆(非滑手機)', '有充分休息', '陪伴彼此', '與朋友聚會'] },
  growth: { title: '自我成長', icon: '✨', items: ['反思了自己', '學習了新技能', '獲得了新想法', '突破了一點', '記下一個好方法改進'] },
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

function PencilSVG({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#fff' : '#9CA3AF'} strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function UserCard({
  userKey, data, config, loading, saved,
  onCheckbox, onScore, onSave, onConfigSave,
}: {
  userKey: 'yumin' | 'sangyuan'
  data: ReflectionData
  config: ChecklistConfig
  loading: boolean
  saved: boolean
  onCheckbox: (category: CategoryKey, item: string) => void
  onScore: (score: number) => void
  onSave: () => void
  onConfigSave: (config: ChecklistConfig) => Promise<void>
}) {
  const cfg = USER_CONFIG[userKey]
  const [editMode, setEditMode] = useState(false)
  const [editConfig, setEditConfig] = useState<ChecklistConfig>(config)
  const [configSaving, setConfigSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  useEffect(() => {
    if (!editMode) setEditConfig(config)
  }, [config, editMode])

  const totalPoints = CATEGORIES.reduce((sum, cat) => sum + data[cat].length, 0)

  const handleEditToggle = () => {
    if (editMode) setEditConfig(config)
    setEditMode(m => !m)
  }

  const handleConfigSave = async () => {
    setConfigSaving(true)
    await onConfigSave(editConfig)
    setConfigSaving(false)
    setEditMode(false)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2000)
  }

  const updateCategoryTitle = (cat: CategoryKey, title: string) => {
    setEditConfig(prev => ({ ...prev, [cat]: { ...prev[cat], title } }))
  }

  const updateCategoryIcon = (cat: CategoryKey, icon: string) => {
    setEditConfig(prev => ({ ...prev, [cat]: { ...prev[cat], icon } }))
  }

  const updateItem = (cat: CategoryKey, index: number, value: string) => {
    setEditConfig(prev => {
      const items = [...prev[cat].items]
      items[index] = value
      return { ...prev, [cat]: { ...prev[cat], items } }
    })
  }

  return (
    <div style={{
      backgroundColor: '#2A2B3D',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      border: `1px solid ${editMode ? cfg.primary + '66' : '#404152'}`,
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.2s ease',
    }}>
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
          fontSize: '32px', boxShadow: `0 4px 12px ${cfg.shadow}`,
        }}>
          {cfg.icon}
        </div>
        <h2 style={{
          margin: 0, fontSize: '26px', fontWeight: 700,
          color: '#FFFFFF', letterSpacing: '-0.5px', flex: 1,
        }}>{cfg.label}</h2>
        <button
          onClick={handleEditToggle}
          title={editMode ? '取消編輯' : '編輯選項'}
          style={{
            background: editMode ? cfg.gradient : '#363749',
            border: 'none', borderRadius: '10px',
            width: '36px', height: '36px',
            cursor: 'pointer', color: '#FFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: editMode ? `0 4px 12px ${cfg.shadow}` : 'none',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          <PencilSVG active={editMode} />
        </button>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div style={{
          backgroundColor: cfg.primary + '22',
          border: `1px solid ${cfg.primary}55`,
          borderRadius: '12px', padding: '10px 16px',
          marginBottom: '20px', fontSize: '13px',
          color: cfg.primary, fontWeight: 600,
        }}>
          編輯模式：修改類別名稱與選項文字，完成後點「儲存設定」
        </div>
      )}

      {/* Points + rating card */}
      {!editMode && (
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
                  boxShadow: data.score === n ? `0 4px 12px ${cfg.shadow}` : '0 2px 4px rgba(0,0,0,0.2)',
                  transform: data.score === n ? 'scale(1.05)' : 'scale(1)',
                  opacity: data.score === n ? 1 : 0.6,
                }}
              >{n}</button>
            ))}
          </div>
        </div>
      )}

      {/* Category sections */}
      {CATEGORIES.map(cat => {
        const display = editMode ? editConfig[cat] : config[cat]
        const checked = data[cat]
        return (
          <div key={cat} style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '17px', fontWeight: 700, margin: '0 0 14px 0',
              display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF',
            }}>
              {editMode ? (
                <input
                  value={editConfig[cat].icon}
                  onChange={e => updateCategoryIcon(cat, e.target.value)}
                  style={{
                    width: '44px', background: '#1E1F2E',
                    border: `1px solid ${cfg.primary}88`,
                    borderRadius: '8px', color: '#FFF',
                    fontSize: '18px', textAlign: 'center',
                    padding: '4px 4px', fontFamily: 'inherit',
                    outline: 'none', flexShrink: 0,
                  }}
                />
              ) : (
                <span style={{ fontSize: '20px' }}>{display.icon}</span>
              )}
              {editMode ? (
                <input
                  value={editConfig[cat].title}
                  onChange={e => updateCategoryTitle(cat, e.target.value)}
                  style={{
                    flex: 1, background: '#1E1F2E',
                    border: `1px solid ${cfg.primary}88`,
                    borderRadius: '8px', color: '#FFF',
                    fontSize: '15px', fontWeight: 700,
                    padding: '5px 10px', fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
              ) : (
                <>
                  <span style={{ flex: 1 }}>{display.title}</span>
                  <span style={{
                    fontSize: '13px', color: '#6B7280', fontWeight: 600,
                    padding: '4px 10px', backgroundColor: '#363749', borderRadius: '8px',
                  }}>
                    {checked.length}/{display.items.length}
                  </span>
                </>
              )}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {display.items.map((item, idx) => {
                if (editMode) {
                  return (
                    <div key={idx} style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute', left: '14px', top: '50%',
                        transform: 'translateY(-50%)', color: '#6B7280',
                        fontSize: '13px', fontWeight: 600, userSelect: 'none',
                      }}>{idx + 1}</span>
                      <input
                        value={editConfig[cat].items[idx]}
                        onChange={e => updateItem(cat, idx, e.target.value)}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: '#363749', border: '1px solid #404152',
                          borderRadius: '14px', color: '#FFF',
                          fontSize: '15px', fontWeight: 500,
                          padding: '13px 16px 13px 36px',
                          fontFamily: 'inherit', outline: 'none',
                          transition: 'border-color 0.15s ease',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = cfg.primary }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#404152' }}
                      />
                    </div>
                  )
                }
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
                      onChange={() => onCheckbox(cat, item)}
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

      {/* Edit mode actions */}
      {editMode ? (
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={handleEditToggle}
            style={{
              flex: 1, padding: '14px', border: '1px solid #404152',
              borderRadius: '16px', fontSize: '15px', fontWeight: 600,
              cursor: 'pointer', background: '#363749', color: '#9CA3AF',
              fontFamily: 'inherit', transition: 'all 0.2s ease',
            }}
          >取消</button>
          <button
            onClick={handleConfigSave}
            disabled={configSaving}
            style={{
              flex: 2, padding: '14px',
              background: cfg.gradient, color: '#FFF', border: 'none',
              borderRadius: '16px', fontSize: '15px', fontWeight: 700,
              cursor: configSaving ? 'not-allowed' : 'pointer',
              boxShadow: `0 6px 20px ${cfg.shadow}`,
              opacity: configSaving ? 0.6 : 1,
              fontFamily: 'inherit', transition: 'all 0.2s ease',
            }}
          >{configSaving ? '儲存中...' : '儲存設定'}</button>
        </div>
      ) : (
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
          {loading ? '保存中...' : (configSaved ? '設定已儲存！' : saved ? '已保存！' : `保存 ${cfg.label} 的記錄`)}
        </button>
      )}
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
  const [configs, setConfigs] = useState<Record<'yumin' | 'sangyuan', ChecklistConfig>>({
    yumin: DEFAULT_CONFIG,
    sangyuan: DEFAULT_CONFIG,
  })

  const dateStr = format(date, 'yyyy-MM-dd')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const loadConfigs = async () => {
      for (const user of ['yumin', 'sangyuan'] as const) {
        const { data: row } = await supabase
          .from('checklist_config').select('config')
          .eq('user', user).maybeSingle()
        if (row?.config) {
          setConfigs(prev => ({ ...prev, [user]: row.config as ChecklistConfig }))
        }
      }
    }
    loadConfigs()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const newData: Record<'yumin' | 'sangyuan', ReflectionData> = {
        yumin: defaultRecord('yumin', dateStr),
        sangyuan: defaultRecord('sangyuan', dateStr),
      }
      for (const user of ['yumin', 'sangyuan'] as const) {
        const { data: records } = await supabase
          .from('reflections').select('*')
          .eq('date', dateStr).eq('user', user)
          .order('id', { ascending: false }).limit(1)
        if (records?.[0]) newData[user] = records[0]
      }
      setData(newData)
      setSaved(null)
      setLoading(false)
    }
    loadData()
  }, [dateStr])

  const handleCheckbox = (userKey: 'yumin' | 'sangyuan', category: CategoryKey, item: string) => {
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
    const { id: _, ...rest } = data[userKey]
    const payload = { ...rest, date: dateStr, user: userKey }
    const { error } = await supabase
      .from('reflections')
      .upsert(payload, { onConflict: 'date,user' })
    if (error) {
      alert(`儲存失敗：${error.message}`)
      setLoading(false)
      return
    }
    setSaved(userKey)
    setLoading(false)
    setTimeout(() => setSaved(null), 2000)
  }

  const handleConfigSave = async (userKey: 'yumin' | 'sangyuan', config: ChecklistConfig) => {
    const { data: existing } = await supabase
      .from('checklist_config').select('id')
      .eq('user', userKey).maybeSingle()
    if (existing) {
      await supabase.from('checklist_config').update({ config }).eq('user', userKey)
    } else {
      await supabase.from('checklist_config').insert([{ user: userKey, config }])
    }
    setConfigs(prev => ({ ...prev, [userKey]: config }))
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#3D3E4E',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: '#FFFFFF',
      padding: isMobile ? '16px' : '24px',
    }}>
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
              config={configs[userKey]}
              loading={loading}
              saved={saved === userKey}
              onCheckbox={(cat, item) => handleCheckbox(userKey, cat, item)}
              onScore={score => handleScore(userKey, score)}
              onSave={() => handleSave(userKey)}
              onConfigSave={config => handleConfigSave(userKey, config)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
