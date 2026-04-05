import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiGetUsers, apiGetRehabSessions } from '../../lib/api'
import useAuthStore from '../../store/authStore'
import GlassCard from '../../components/ui/GlassCard'
import MonoChip from '../../components/ui/MonoChip'
import PillButton from '../../components/ui/PillButton'
import LoadingVoid from '../../components/ui/LoadingVoid'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
}

function emailPrefix(email = '') {
  return email.split('@')[0]
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getStatus(latestSession, patient) {
  if (!latestSession) return 'new'
  const d = latestSession.session_date
  if (d === todayStr()) return 'on-track'
  if (d === yesterdayStr()) return 'yesterday'
  if (daysSince(d) >= 2) return 'missed'
  return 'on-track'
}

// ─────────────────────────────────────────────────────────────
// COUNT-UP NUMBER HOOK
// ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return value
}

// ─────────────────────────────────────────────────────────────
// STAT BLOCK
// ─────────────────────────────────────────────────────────────
function StatBlock({ count, label }) {
  const animated = useCountUp(count)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{
        fontFamily: '"DM Mono", monospace',
        fontSize: '28px',
        fontWeight: 500,
        color: '#C9A84C',
        lineHeight: 1,
      }}>
        {animated}
      </span>
      <span style={{
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '12px',
        color: 'rgba(240,237,230,0.4)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LIVE INDICATOR
// ─────────────────────────────────────────────────────────────
function LiveIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      <div style={{
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: '#4CAF82',
        animation: 'livePulse 1.8s ease-in-out infinite',
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: '"DM Mono", monospace',
        fontSize: '11px',
        letterSpacing: '0.12em',
        color: 'rgba(240,237,230,0.5)',
      }}>
        LIVE
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────
function RehabProgressBar({ rehabDay }) {
  const pct = Math.min(((rehabDay || 0) / 90) * 100, 100)
  return (
    <div style={{
      height: '3px',
      borderRadius: '999px',
      background: 'rgba(255,255,255,0.07)',
      overflow: 'hidden',
    }}>
      <motion.div
        initial={{ width: '0%' }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          height: '100%',
          borderRadius: '999px',
          background: '#C9A84C',
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PATIENT CARD
// ─────────────────────────────────────────────────────────────
function PatientCard({ patient, latestSession, index, onClick }) {
  const status = getStatus(latestSession, patient)

  const chipMap = {
    'on-track': { text: 'ON TRACK', color: 'gold' },
    'yesterday': { text: 'YESTERDAY', color: 'blue' },
    'new': { text: 'NEW', color: 'dim' },
    'missed': { text: 'MISSED', color: 'red' },
  }
  const chip = chipMap[status] || chipMap['new']

  const lastDateLabel = latestSession?.session_date ? formatDate(latestSession.session_date) : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
    >
      <GlassCard goldHover onClick={onClick}>
        <div style={{ padding: '20px 22px', cursor: 'pointer' }}>

          {/* ROW 1 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '15px',
              fontWeight: 600,
              color: '#F0EDE6',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '60%',
            }}>
              {patient.full_name || patient.email?.split('@')[0]}
            </span>
            <MonoChip text={`DAY ${patient.rehab_day ?? 0}`} color="blue" />
          </div>

          {/* ROW 2 */}
          <div style={{ marginTop: '6px' }}>
            <span style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: '11px',
              color: 'rgba(240,237,230,0.4)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              REHAB DAY {patient.rehab_day ?? 0}
              {patient.injury_type ? ` · ${patient.injury_type.toUpperCase()}` : ''}
            </span>
          </div>

          {/* ROW 3 — Progress bar */}
          <div style={{ marginTop: '14px' }}>
            <RehabProgressBar rehabDay={patient.rehab_day ?? 0} />
          </div>

          {/* ROW 4 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '14px',
          }}>
            <MonoChip text={chip.text} color={chip.color} />
            <span style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: '10px',
              color: 'rgba(240,237,230,0.3)',
              letterSpacing: '0.08em',
            }}>
              {lastDateLabel}
            </span>
          </div>

        </div>
      </GlassCard>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        textAlign: 'center',
        marginTop: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{
        fontFamily: '"DM Mono", monospace',
        fontSize: '11px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(240,237,230,0.3)',
      }}>
        NO PATIENTS REGISTERED YET
      </span>
      <span style={{
        fontFamily: '"DM Sans", sans-serif',
        fontSize: '14px',
        color: 'rgba(240,237,230,0.5)',
      }}>
        Register a patient to get started.
      </span>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN DOCTOR DASHBOARD
// ─────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [patients, setPatients] = useState([])
  const [sessionMap, setSessionMap] = useState({})
  const [loading, setLoading] = useState(true)

  // ── Fetch all patients + their latest session ──────────────
  const fetchPatients = async () => {
    try {
      const patientList = await apiGetUsers('patient')
      setPatients(patientList)

      // Fetch latest session per patient in parallel
      const entries = await Promise.all(
        patientList.map(async (p) => {
          try {
            const sessions = await apiGetRehabSessions(p.id, { order: '-session_date', limit: 1 })
            return [p.id, sessions?.[0] ?? null]
          } catch {
            return [p.id, null]
          }
        })
      )

      setSessionMap(Object.fromEntries(entries))
    } catch (err) {
      console.error('Failed to fetch patients:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPatients()
    // Poll every 30 seconds for updates (replaces Supabase realtime)
    const interval = setInterval(fetchPatients, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  // ── Derived stats ──────────────────────────────────────────
  const today = todayStr()

  const totalPatients = patients.length

  const activeToday = patients.filter(p => {
    const s = sessionMap[p.id]
    return s?.session_date === today
  }).length

  const needAttention = patients.filter(p => {
    const s = sessionMap[p.id]
    const days = s ? daysSince(s.session_date) : Infinity
    return days >= 2 && (p.rehab_day ?? 0) > 3
  }).length

  // ── Loading ────────────────────────────────────────────────
  if (loading) return <LoadingVoid text="loading patient roster..." />

  return (
    <div style={{
      background: '#08090F',
      minHeight: '100vh',
      padding: '40px',
      boxSizing: 'border-box',
    }}>

      {/* ── HEADER ROW ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <p style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '14px',
            color: 'rgba(240,237,230,0.5)',
            margin: 0,
          }}>
            Welcome back, Doctor
          </p>
          <h1 style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(36px, 5vw, 52px)',
            color: '#F0EDE6',
            margin: '4px 0 0',
            lineHeight: 1.1,
          }}>
            Patient Roster
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <PillButton variant="gold" onClick={() => navigate('/doctor/register-patient')}>
            + REGISTER PATIENT
          </PillButton>
          <LiveIndicator />
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div style={{
        display: 'flex',
        gap: '48px',
        margin: '28px 0 36px',
        flexWrap: 'wrap',
      }}>
        <StatBlock count={totalPatients} label="Total Patients" />
        <StatBlock count={activeToday} label="Active Today" />
        <StatBlock count={needAttention} label="Need Attention" />
      </div>

      {/* ── Thin gold divider ── */}
      <div style={{
        height: '1px',
        background: 'rgba(201,168,76,0.1)',
        marginBottom: '28px',
      }} />

      {/* ── PATIENT GRID ── */}
      {patients.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          {patients.map((patient, i) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              latestSession={sessionMap[patient.id] ?? null}
              index={i}
              onClick={() => navigate(`/doctor/patient/${patient.id}`)}
            />
          ))}
        </div>
      )}

      {/* ── SIGN OUT ── */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        marginTop: '48px',
      }}>
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: '"DM Mono", monospace',
            fontSize: '10px', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(240,237,230,0.25)',
            padding: '4px 0',
            transition: 'color 200ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#C47474'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,237,230,0.25)'}
        >
          SIGN OUT
        </button>
      </div>

    </div>
  )
}
