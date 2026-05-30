'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'

const SCORE_EMOJIS = [
  { score: 1, emoji: '😵' },
  { score: 2, emoji: '😕' },
  { score: 3, emoji: '😐' },
  { score: 4, emoji: '🙂' },
  { score: 5, emoji: '😁' },
]

const USER_CONFIG = {
  yumin: {
    label: '玉米',
    gradient: 'linear-gradient(135deg, #ffcc20 0%, #FF6B35 100%)',
    primary: '#FF8B4D',
  },
  sangyuan: {
    label: '三元',
    gradient: 'linear-gradient(135deg, #45D4C4 0%, #2b8bb8 100%)',
    primary: '#45D4C4',
  },
}

type PeriodKey = 'this_month' | 'last_month' | 'last_3_months' | 'this_year'

function getPeriodRange(period: PeriodKey): { start: string; end: string; label: string } {
  const today = new Date()
  switch (period) {
    case 'this_month': {
      const month = today.getMonth() + 1
      return {
        start: format(startOfMonth(today), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
        label: `本月（${month}月）`,
      }
    }
    case 'last_month': {
      const last = subMonths(today, 1)
      const month = last.getMonth() + 1
      return {
        start: format(startOfMonth(last), 'yyyy-MM-dd'),
        end: format(endOfMonth(last), 'yyyy-MM-dd'),
        label: `上個月（${month}月）`,
      }
    }
    case 'last_3_months': {
      const threeAgo = subMonths(today, 3)
      return {
        start: format(startOfMonth(threeAgo), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
        label: '最近3個月',
      }
    }
    case 'this_year': {
      return {
        start: format(startOfYear(today), 'yyyy-MM-dd'),
        end: format(endOfYear(today), 'yyyy-MM-dd'),
        label: `今年（${today.getFullYear()}年）`,
      }
    }
  }
}

type UserStats = {
  mostFrequentScore: number
  avgScore: number
  count: number
}

function ChevronDownSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

const PERIODS: { key: PeriodKey }[] = [
  { key: 'this_month' },
  { key: 'last_month' },
  { key: 'last_3_months' },
  { key: 'this_year' },
]

export default function InsightsPage({ onBack }: { onBack: () => void }) {
  const [period, setPeriod] = useState<PeriodKey>('this_month')
  const [showDropdown, setShowDropdown] = useState(false)
  const [stats, setStats] = useState<Record<'yumin' | 'sangyuan', UserStats | null>>({
    yumin: null,
    sangyuan: null,
  })
  const [loading, setLoading] = useState(true)

  const periodInfo = getPeriodRange(period)

  useEffect(() => {
    const { start, end } = getPeriodRange(period)

    const fetchStats = async () => {
      setLoading(true)
      const newStats: Record<'yumin' | 'sangyuan', UserStats | null> = {
        yumin: null,
        sangyuan: null,
      }

      for (const user of ['yumin', 'sangyuan'] as const) {
        const { data } = await supabase
          .from('reflections')
          .select('score')
          .eq('user', user)
          .gte('date', start)
          .lte('date', end)
          .gt('score', 0)

        if (data && data.length > 0) {
          const scores = data.map(r => r.score as number)
          const total = scores.reduce((sum, s) => sum + s, 0)
          const avgScore = total / scores.length

          const freq: Record<number, number> = {}
          for (const s of scores) {
            freq[s] = (freq[s] || 0) + 1
          }
          const mostFrequentScore = Number(
            Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
          )

          newStats[user] = { mostFrequentScore, avgScore, count: scores.length }
        }
      }

      setStats(newStats)
      setLoading(false)
    }

    fetchStats()
  }, [period])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#3D3E4E',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: '#FFFFFF',
      padding: '16px',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '24px', paddingTop: '8px',
      }}>
        <button
          onClick={onBack}
          style={{
            background: '#2A2B3D', border: '1px solid #404152',
            borderRadius: '50%', width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#FFF', fontSize: '20px',
            flexShrink: 0, lineHeight: 1,
          }}
        >‹</button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>洞察</h1>
      </div>

      {/* Period selector */}
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <button
          onClick={() => setShowDropdown(d => !d)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#2A2B3D', border: '1px solid #404152',
            borderRadius: '16px', padding: '16px 20px',
            color: '#FFF', fontSize: '17px', fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: 'inherit',
          }}
        >
          <span>{periodInfo.label}</span>
          <ChevronDownSVG />
        </button>

        {showDropdown && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
            background: '#2A2B3D', border: '1px solid #404152',
            borderRadius: '16px', overflow: 'hidden',
            zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {PERIODS.map(p => {
              const info = getPeriodRange(p.key)
              const isSelected = period === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => { setPeriod(p.key); setShowDropdown(false) }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: isSelected ? '#363749' : 'transparent',
                    border: 'none', padding: '16px 20px',
                    color: isSelected ? '#FFF' : '#9CA3AF',
                    fontSize: '16px', fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >{info.label}</button>
              )
            })}
          </div>
        )}
      </div>

      {/* Mood overview */}
      <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px 0' }}>心情總覽</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {(['yumin', 'sangyuan'] as const).map(user => {
          const cfg = USER_CONFIG[user]
          const userStats = stats[user]
          const emoji = userStats
            ? SCORE_EMOJIS.find(e => e.score === userStats.mostFrequentScore)?.emoji
            : null

          return (
            <div key={user} style={{
              backgroundColor: '#2A2B3D', borderRadius: '20px',
              padding: '24px 16px', border: '1px solid #404152',
              textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: '3px', background: cfg.gradient,
              }} />

              <p style={{ margin: '0 0 20px 0', fontSize: '17px', fontWeight: 700, color: '#FFF' }}>
                {cfg.label}
              </p>

              {loading ? (
                <div style={{ color: '#6B7280', fontSize: '14px', padding: '24px 0' }}>載入中...</div>
              ) : userStats ? (
                <>
                  <div style={{ fontSize: '52px', lineHeight: 1, marginBottom: '12px' }}>
                    {emoji}
                  </div>
                  <p style={{
                    margin: '0 0 8px 0', fontSize: '12px',
                    color: '#6B7280', fontWeight: 600,
                  }}>最常出現</p>
                  <div style={{
                    fontSize: '40px', fontWeight: 800, lineHeight: 1,
                    color: cfg.primary, marginBottom: '6px', letterSpacing: '-1px',
                  }}>
                    {userStats.avgScore.toFixed(1)}
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
                    平均分數 / 5
                  </p>
                </>
              ) : (
                <div style={{ color: '#6B7280', fontSize: '14px', padding: '24px 0' }}>
                  暫無資料
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
