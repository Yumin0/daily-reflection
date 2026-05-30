'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths, subDays, differenceInCalendarDays, parseISO } from 'date-fns'

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

type PeriodKey = 'last_7_days' | 'last_14_days' | 'this_month' | 'last_month' | 'all_time'

function getPeriodRange(period: PeriodKey): { start: string; end: string; label: string } {
  const today = new Date()
  switch (period) {
    case 'last_7_days':
      return {
        start: format(subDays(today, 6), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
        label: '近 1 週',
      }
    case 'last_14_days':
      return {
        start: format(subDays(today, 13), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
        label: '近 2 週',
      }
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
        label: `上月（${month}月）`,
      }
    }
    case 'all_time':
      return {
        start: '2020-01-01',
        end: format(today, 'yyyy-MM-dd'),
        label: '截至目前為止',
      }
  }
}

const SHARED_CHALLENGES = [
  { label: '12點前睡覺', yumin: '12點前睡覺', sangyuan: '12點前睡覺' },
  { label: '有吃蔬菜或水果', yumin: '有吃到蔬菜或水果', sangyuan: '有吃蔬菜或水果' },
]

type UserStats = {
  mostFrequentScore: number
  avgScore: number
  count: number
}

type ChallengeStats = {
  label: string
  count: number
  total: number
  pct: number
}

type ChallengeView = 'both' | 'yumin' | 'sangyuan'

type RankingView = 'both' | 'yumin' | 'sangyuan'
type RankingItem = { label: string; count: number; users: ('yumin' | 'sangyuan')[] }
type RankingData = { done: RankingItem[]; forgotten: RankingItem[] }

function parseUserItems(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return []
  const r = raw as Record<string, unknown>
  if (Array.isArray(r.categories)) {
    return (r.categories as Array<{ items?: string[] }>).flatMap(c => c.items ?? [])
  }
  return ['diet', 'work', 'rest', 'growth']
    .filter(k => k in r && r[k] && typeof r[k] === 'object')
    .flatMap(k => ((r[k] as { items?: string[] }).items ?? []))
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
  { key: 'last_7_days' },
  { key: 'last_14_days' },
  { key: 'this_month' },
  { key: 'last_month' },
  { key: 'all_time' },
]

export default function InsightsPage({ onBack }: { onBack: () => void }) {
  const [period, setPeriod] = useState<PeriodKey>('this_month')
  const [showDropdown, setShowDropdown] = useState(false)
  const [stats, setStats] = useState<Record<'yumin' | 'sangyuan', UserStats | null>>({
    yumin: null,
    sangyuan: null,
  })
  const [challengeStats, setChallengeStats] = useState<Record<ChallengeView, ChallengeStats[]>>({ both: [], yumin: [], sangyuan: [] })
  const [challengeView, setChallengeView] = useState<ChallengeView>('both')
  const [rankingView, setRankingView] = useState<RankingView>('both')
  const [rankingData, setRankingData] = useState<Record<RankingView, RankingData>>({
    both: { done: [], forgotten: [] },
    yumin: { done: [], forgotten: [] },
    sangyuan: { done: [], forgotten: [] },
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

      // Shared challenges
      const { data: challengeData } = await supabase
        .from('reflections')
        .select('date, user, diet, work, rest, growth')
        .in('user', ['yumin', 'sangyuan'])
        .gte('date', start)
        .lte('date', end)

      if (challengeData) {
        const byDate: Record<string, Record<'yumin' | 'sangyuan', string[]>> = {}
        for (const row of challengeData) {
          const allItems = [
            ...(row.diet || []),
            ...(row.work || []),
            ...(row.rest || []),
            ...(row.growth || []),
          ]
          if (!byDate[row.date]) byDate[row.date] = { yumin: [], sangyuan: [] }
          byDate[row.date][row.user as 'yumin' | 'sangyuan'] = allItems
        }

        const today = format(new Date(), 'yyyy-MM-dd')
        const effectiveEnd = end < today ? end : today
        const totalDays = differenceInCalendarDays(parseISO(effectiveEnd), parseISO(start)) + 1

        const computeView = (check: (day: Record<'yumin' | 'sangyuan', string[]>, yl: string, sl: string) => boolean) =>
          SHARED_CHALLENGES.map(({ label, yumin: yl, sangyuan: sl }) => {
            const count = Object.values(byDate).filter(day => check(day, yl, sl)).length
            return { label, count, total: totalDays, pct: Math.round(count / totalDays * 100) }
          })

        setChallengeStats({
          both: computeView((day, yl, sl) => day.yumin.includes(yl) && day.sangyuan.includes(sl)),
          yumin: computeView((day, yl) => day.yumin.includes(yl)),
          sangyuan: computeView((day, _yl, sl) => day.sangyuan.includes(sl)),
        })

        // Fetch checklist configs for ranking
        const userItems: Record<'yumin' | 'sangyuan', string[]> = { yumin: [], sangyuan: [] }
        await Promise.all((['yumin', 'sangyuan'] as const).map(async (u) => {
          const { data: cfg } = await supabase.from('checklist_config').select('config').eq('user', u).maybeSingle()
          userItems[u] = parseUserItems(cfg?.config)
        }))

        // Compute done counts per user
        const doneCounts: Record<'yumin' | 'sangyuan', Record<string, number>> = { yumin: {}, sangyuan: {} }

        for (const row of challengeData) {
          const u = row.user as 'yumin' | 'sangyuan'
          const checked = new Set<string>([
            ...(row.diet ?? []),
            ...(row.work ?? []),
            ...(row.rest ?? []),
            ...(row.growth ?? []),
          ])
          for (const item of checked) {
            doneCounts[u][item] = (doneCounts[u][item] ?? 0) + 1
          }
        }

        // Top 5 most done (descending)
        const top5 = (counts: Record<string, number>, user: 'yumin' | 'sangyuan'): RankingItem[] =>
          Object.entries(counts)
            .map(([label, count]) => ({ label, count, users: [user] as ('yumin' | 'sangyuan')[] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

        const bothTop5 = (a: Record<string, number>, b: Record<string, number>): RankingItem[] => [
          ...Object.entries(a).map(([label, count]) => ({ label, count, users: ['yumin' as const] })),
          ...Object.entries(b).map(([label, count]) => ({ label, count, users: ['sangyuan' as const] })),
        ].sort((x, y) => y.count - x.count).slice(0, 5)

        // Bottom 5 least done from config items (ascending), only items done at least once
        const bottom5 = (counts: Record<string, number>, configItems: string[], user: 'yumin' | 'sangyuan'): RankingItem[] =>
          configItems
            .filter(item => (counts[item] ?? 0) > 0)
            .map(item => ({ label: item, count: counts[item] ?? 0, users: [user] as ('yumin' | 'sangyuan')[] }))
            .sort((a, b) => a.count - b.count)
            .slice(0, 5)

        const bothBottom5 = (
          yCounts: Record<string, number>, yItems: string[],
          sCounts: Record<string, number>, sItems: string[]
        ): RankingItem[] => [
          ...yItems.filter(item => (yCounts[item] ?? 0) > 0).map(item => ({ label: item, count: yCounts[item] ?? 0, users: ['yumin' as const] })),
          ...sItems.filter(item => (sCounts[item] ?? 0) > 0).map(item => ({ label: item, count: sCounts[item] ?? 0, users: ['sangyuan' as const] })),
        ].sort((a, b) => a.count - b.count).slice(0, 5)

        setRankingData({
          yumin: { done: top5(doneCounts.yumin, 'yumin'), forgotten: bottom5(doneCounts.yumin, userItems.yumin, 'yumin') },
          sangyuan: { done: top5(doneCounts.sangyuan, 'sangyuan'), forgotten: bottom5(doneCounts.sangyuan, userItems.sangyuan, 'sangyuan') },
          both: {
            done: bothTop5(doneCounts.yumin, doneCounts.sangyuan),
            forgotten: bothBottom5(doneCounts.yumin, userItems.yumin, doneCounts.sangyuan, userItems.sangyuan),
          },
        })
      }

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

      {/* Shared challenges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '32px 0 16px 0' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>共同挑戰</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {([
            { key: 'both', label: '全部' },
            { key: 'yumin', label: '玉米', color: '#FF8B4D' },
            { key: 'sangyuan', label: '三元', color: '#45D4C4' },
          ] as { key: ChallengeView; label: string; color?: string }[]).map(btn => {
            const isActive = challengeView === btn.key
            const activeColor = btn.color ?? '#FFFFFF'
            return (
              <button
                key={btn.key}
                onClick={() => setChallengeView(btn.key)}
                style={{
                  border: `1.5px solid ${isActive ? activeColor : '#404152'}`,
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: isActive ? `${activeColor}22` : 'transparent',
                  color: isActive ? activeColor : '#6B7280',
                  transition: 'all 0.15s ease',
                }}
              >{btn.label}</button>
            )
          })}
        </div>
      </div>
      <div style={{
        backgroundColor: '#2A2B3D', borderRadius: '20px',
        padding: '20px', border: '1px solid #404152',
      }}>
        {loading ? (
          <div style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>載入中...</div>
        ) : challengeStats[challengeView].length === 0 ? (
          <div style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>暫無資料</div>
        ) : challengeStats[challengeView].map((c, i) => {
          const isBoth = challengeView === 'both'
          const solidColor = { yumin: '#FF8B4D', sangyuan: '#45D4C4' }[challengeView as 'yumin' | 'sangyuan']
          const list = challengeStats[challengeView]
          return (
            <div key={c.label} style={{ marginBottom: i < list.length - 1 ? '24px' : 0 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px',
              }}>
                <span style={{ fontSize: '17px', fontWeight: 700 }}>{c.label}</span>
                <span>
                  <span style={{ fontSize: '20px', fontWeight: 800 }}>{c.pct}%</span>
                  <span style={{ fontSize: '13px', color: '#9CA3AF', marginLeft: '6px' }}>
                    ({c.count}/{c.total}天)
                  </span>
                </span>
              </div>
              <div style={{
                height: '8px', backgroundColor: '#404152', borderRadius: '4px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${c.pct}%`,
                  ...(isBoth && c.pct > 0
                    ? {
                        background: 'linear-gradient(to right, #FF8B4D, #45D4C4)',
                        backgroundSize: `${(10000 / c.pct).toFixed(1)}% 100%`,
                        backgroundPosition: 'left center',
                      }
                    : { background: solidColor ?? '#FF8B4D' }),
                  borderRadius: '4px', transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Top 5 排名 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '32px 0 16px 0' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Top 5 排名</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {([
            { key: 'both', label: '全部' },
            { key: 'yumin', label: '玉米', color: '#FF8B4D' },
            { key: 'sangyuan', label: '三元', color: '#45D4C4' },
          ] as { key: RankingView; label: string; color?: string }[]).map(btn => {
            const isActive = rankingView === btn.key
            const activeColor = btn.color ?? '#FFFFFF'
            return (
              <button
                key={btn.key}
                onClick={() => setRankingView(btn.key)}
                style={{
                  border: `1.5px solid ${isActive ? activeColor : '#404152'}`,
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: isActive ? `${activeColor}22` : 'transparent',
                  color: isActive ? activeColor : '#6B7280',
                  transition: 'all 0.15s ease',
                }}
              >{btn.label}</button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>載入中...</div>
      ) : (
        <>
          {/* 最常做到 */}
          <div style={{
            backgroundColor: '#2A2B3D', borderRadius: '20px',
            padding: '20px', border: '1px solid #404152', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#FF8B4D', marginBottom: '20px' }}>
              ✅ 最常做到
            </div>
            {rankingData[rankingView].done.length === 0 ? (
              <div style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '8px 0' }}>暫無資料</div>
            ) : rankingData[rankingView].done.map((item, i) => {
              const maxCount = rankingData[rankingView].done[0].count
              const soleUser = rankingView === 'both' ? item.users[0] : null
              return (
                <div key={`${item.label}-${item.users[0]}`} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: i < rankingData[rankingView].done.length - 1 ? '16px' : 0,
                }}>
                  <span style={{ width: '16px', color: '#6B7280', fontWeight: 700, fontSize: '15px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ fontSize: '16px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    {soleUser && (
                      <span style={{
                        fontSize: '11px', fontWeight: 600, flexShrink: 0,
                        color: soleUser === 'yumin' ? '#FF8B4D' : '#45D4C4',
                        border: `1px solid ${soleUser === 'yumin' ? '#FF8B4D' : '#45D4C4'}`,
                        borderRadius: '8px', padding: '1px 6px',
                      }}>{soleUser === 'yumin' ? '玉米' : '三元'}</span>
                    )}
                  </span>
                  <div style={{ width: '90px', height: '8px', backgroundColor: '#404152', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${Math.round(item.count / maxCount * 100)}%`, background: '#FF8B4D', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ color: '#FF8B4D', fontWeight: 700, fontSize: '15px', minWidth: '46px', textAlign: 'right', flexShrink: 0 }}>{item.count}次</span>
                </div>
              )
            })}
          </div>

          {/* 最常忘記 */}
          <div style={{
            backgroundColor: '#2A2B3D', borderRadius: '20px',
            padding: '20px', border: '1px solid #404152',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#45D4C4', marginBottom: '20px' }}>
              💤 最常忘記
            </div>
            {rankingData[rankingView].forgotten.length === 0 ? (
              <div style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '8px 0' }}>暫無資料</div>
            ) : rankingData[rankingView].forgotten.map((item, i) => {
              const maxCount = rankingData[rankingView].forgotten[0].count
              const soleUser = rankingView === 'both' ? item.users[0] : null
              return (
                <div key={`${item.label}-${item.users[0]}`} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: i < rankingData[rankingView].forgotten.length - 1 ? '16px' : 0,
                }}>
                  <span style={{ width: '16px', color: '#6B7280', fontWeight: 700, fontSize: '15px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ fontSize: '16px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    {soleUser && (
                      <span style={{
                        fontSize: '11px', fontWeight: 600, flexShrink: 0,
                        color: soleUser === 'yumin' ? '#FF8B4D' : '#45D4C4',
                        border: `1px solid ${soleUser === 'yumin' ? '#FF8B4D' : '#45D4C4'}`,
                        borderRadius: '8px', padding: '1px 6px',
                      }}>{soleUser === 'yumin' ? '玉米' : '三元'}</span>
                    )}
                  </span>
                  <div style={{ width: '90px', height: '8px', backgroundColor: '#404152', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${Math.round(item.count / maxCount * 100)}%`, background: '#45D4C4', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ color: '#45D4C4', fontWeight: 700, fontSize: '15px', minWidth: '46px', textAlign: 'right', flexShrink: 0 }}>{item.count}次</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
