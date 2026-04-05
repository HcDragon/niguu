import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { authFetch } from '../../lib/api'
import RecoveryGraphs from '../../components/RecoveryGraphs'
import GlassCard from '../../components/ui/GlassCard'
import MonoChip from '../../components/ui/MonoChip'
import LoadingVoid from '../../components/ui/LoadingVoid'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function fmtDateLong(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function emailFirstLetter(name = '', email = '') {
  const char = (name || email || '?')[0]
  return char.toUpperCase()
}

const EXERCISE_DISPLAY = {
  elbow_stretching: { name: 'Elbow Stretching', desc: 'Elbow and arm stretching exercises' },
  lateral_raises: { name: 'Lateral Raises', desc: 'Shoulder lateral arm raises' },
  cognitive_rehab: { name: 'Cognitive Rehabilitation', desc: 'Memory, pattern, and reaction games' },
}

// ─────────────────────────────────────────────────────────────
// LIVE DOT
// ─────────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <>
      <style>{`
        @keyframes liveDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: '#4CAF82',
        animation: 'liveDot 1.8s ease-in-out infinite',
        flexShrink: 0,
      }} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// INFO ROW
// ─────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{
        fontFamily: '"DM Mono", monospace', fontSize: '10px',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(240,237,230,0.4)',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: '"DM Mono", monospace', fontSize: '12px',
        color: '#F0EDE6', maxWidth: '55%', textAlign: 'right',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value || '—'}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function PatientInsightPage() {
  const navigate = useNavigate()
  const { userId } = useParams()

  const [patient, setPatient] = useState(null)
  const [cogProgress, setCogProgress] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    try {
      const [users, progress] = await Promise.all([
        authFetch(`/api/users/?role=patient`),
        authFetch(`/api/cognitive-progress/?user_id=${userId}`),
      ])
      const found = users.find(u => u.id === userId)
      setPatient(found || null)
      setCogProgress(progress || [])
    } catch (err) {
      console.error('Failed to fetch patient insight:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [userId])

  if (loading) return <LoadingVoid text="loading patient profile..." />
  if (!patient) return <LoadingVoid text="patient not found" />

  const exercises = patient.assigned_exercises || []
  const plan = patient.exercise_plan || {}

  return (
    <div style={{
      background: '#08090F', minHeight: '100vh',
      padding: '40px', boxSizing: 'border-box',
      maxWidth: '1200px', margin: '0 auto',
    }}>

      {/* ── Back link ── */}
      <button
        onClick={() => navigate('/doctor/dashboard')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: '"DM Mono", monospace', fontSize: '11px',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(201,168,76,0.7)', padding: '0 0 4px 0',
          transition: 'color 200ms',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(201,168,76,0.7)'}
      >
        ← ROSTER
      </button>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          marginTop: '20px', marginBottom: '14px',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"DM Mono", monospace', fontSize: '20px',
            color: '#C9A84C', flexShrink: 0,
          }}>
            {emailFirstLetter(patient.full_name, patient.email)}
          </div>
          <div>
            <h1 style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontStyle: 'italic', fontWeight: 300,
              fontSize: 'clamp(32px, 5vw, 44px)',
              color: '#F0EDE6', margin: 0, lineHeight: 1.1,
            }}>
              {patient.full_name || patient.email?.split('@')[0]}
            </h1>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px',
              flexWrap: 'wrap',
            }}>
              <LiveDot />
              {patient.patient_id && (
                <MonoChip text={patient.patient_id} color="gold" />
              )}
              {patient.injury_type && (
                <MonoChip text={patient.injury_type.toUpperCase()} color="blue" />
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Two-column layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '24px',
        marginTop: '20px',
      }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Patient Info Card */}
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '10px',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(240,237,230,0.4)', marginBottom: '12px',
              }}>
                PATIENT DETAILS
              </div>
              <InfoRow label="Patient ID" value={patient.patient_id} />
              <InfoRow label="Age" value={patient.age ? `${patient.age} yrs` : null} />
              <InfoRow label="Gender" value={patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : null} />
              <InfoRow label="Injury" value={patient.injury_type} />
              <InfoRow label="Rehab Day" value={patient.rehab_day ?? 0} />
              <InfoRow label="Pain Tolerance" value={(patient.pain_tolerance ?? 1).toFixed(1)} />
              <InfoRow label="Cog Score" value={(patient.overall_cog_score ?? 0).toFixed(1)} />
              <InfoRow label="Joined" value={fmtDateLong(patient.created_at)} />
            </div>
          </GlassCard>

          {/* Injury Details Card */}
          {patient.injury_details && (
            <GlassCard>
              <div style={{ padding: '20px' }}>
                <div style={{
                  fontFamily: '"DM Mono", monospace', fontSize: '10px',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'rgba(240,237,230,0.4)', marginBottom: '10px',
                }}>
                  INJURY DETAILS
                </div>
                <p style={{
                  fontFamily: '"DM Sans", sans-serif', fontSize: '13px',
                  color: 'rgba(240,237,230,0.6)', lineHeight: 1.6, margin: 0,
                }}>
                  {patient.injury_details}
                </p>
              </div>
            </GlassCard>
          )}

          {/* Assigned Exercises Card */}
          {exercises.length > 0 && (
            <GlassCard>
              <div style={{ padding: '20px' }}>
                <div style={{
                  fontFamily: '"DM Mono", monospace', fontSize: '10px',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'rgba(240,237,230,0.4)', marginBottom: '12px',
                }}>
                  ASSIGNED EXERCISES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {exercises.map(key => {
                    const ex = EXERCISE_DISPLAY[key] || { name: key, desc: '' }
                    return (
                      <div key={key} style={{
                        padding: '10px 12px', borderRadius: '8px',
                        background: 'rgba(201,168,76,0.06)',
                        border: '1px solid rgba(201,168,76,0.15)',
                      }}>
                        <div style={{
                          fontFamily: '"DM Sans", sans-serif', fontSize: '13px',
                          fontWeight: 600, color: '#F0EDE6', marginBottom: '2px',
                        }}>
                          {ex.name}
                        </div>
                        <div style={{
                          fontFamily: '"DM Sans", sans-serif', fontSize: '11px',
                          color: 'rgba(240,237,230,0.4)',
                        }}>
                          {ex.desc}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Exercise plan chips */}
                {Object.keys(plan).length > 0 && (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px',
                  }}>
                    {plan.sessions_per_day && <MonoChip text={`${plan.sessions_per_day}x/DAY`} color="blue" />}
                    {plan.sets && <MonoChip text={`${plan.sets} SETS`} color="dim" />}
                    {plan.reps_per_set && <MonoChip text={`${plan.reps_per_set} REPS`} color="dim" />}
                    {plan.hold_secs && <MonoChip text={`${plan.hold_secs}S HOLD`} color="gold" />}
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>

        {/* ── RIGHT: GRAPHS + COGNITIVE ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Recovery Graphs */}
          <RecoveryGraphs userId={userId} isDoctor={true} />

          {/* Cognitive progress */}
          {cogProgress.length > 0 && (
            <div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '11px',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(240,237,230,0.4)', marginBottom: '16px',
              }}>
                Cognitive Game Progress
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '14px',
              }}>
                {cogProgress.map(g => (
                  <GlassCard key={g.id}>
                    <div style={{ padding: '16px' }}>
                      <div style={{
                        fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
                        fontWeight: 600, color: '#F0EDE6', textTransform: 'capitalize',
                        marginBottom: '8px',
                      }}>
                        {g.game_name?.replace(/-/g, ' ')}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <MonoChip text={`SESSIONS: ${g.sessions_played ?? 0}`} color="white" />
                        <MonoChip text={`BEST LVL: ${g.best_level ?? 0}`} color="blue" />
                        <MonoChip text={`AVG: ${(g.avg_cog_score ?? 0).toFixed(0)}%`} color="gold" />
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
