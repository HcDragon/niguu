import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import { ExerciseSession, EXERCISE_CONFIGS, STATES } from '../../lib/exerciseEngine'
import { authFetch } from '../../lib/api'
import useAuthStore from '../../store/authStore'
import GlassCard from '../../components/ui/GlassCard'
import PillButton from '../../components/ui/PillButton'
import MonoChip from '../../components/ui/MonoChip'
import LoadingVoid from '../../components/ui/LoadingVoid'

// ─────────────────────────────────────────────────────────────
// STATE COLORS
// ─────────────────────────────────────────────────────────────
const STATE_COLORS = {
  [STATES.RELAXED]: '#6B7280',
  [STATES.CURLING]: '#C9A84C',
  [STATES.HOLDING]: '#F59E0B',
  [STATES.STRETCHED]: '#10B981',
  [STATES.EXTENDING]: '#3B82F6',
}

const STATE_LABELS = {
  [STATES.RELAXED]: 'RELAXED — Get ready',
  [STATES.CURLING]: 'MOVING — Keep going!',
  [STATES.HOLDING]: 'HOLD IT — Stay still!',
  [STATES.STRETCHED]: 'HELD ✓ — Now return',
  [STATES.EXTENDING]: 'RETURNING — Almost done',
}

// ─────────────────────────────────────────────────────────────
// EXERCISE CARD (selection phase)
// ─────────────────────────────────────────────────────────────
function ExerciseCard({ exerciseKey, config, onSelect, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <GlassCard goldHover onClick={() => onSelect(exerciseKey)}>
        <div style={{ padding: '24px', cursor: 'pointer' }}>
          <div style={{
            fontFamily: '"DM Sans", sans-serif', fontSize: '16px',
            fontWeight: 600, color: '#F0EDE6', marginBottom: '8px',
          }}>
            {config.display_name}
          </div>
          <p style={{
            fontFamily: '"DM Sans", sans-serif', fontSize: '13px',
            color: 'rgba(240,237,230,0.5)', margin: '0 0 12px', lineHeight: 1.5,
          }}>
            {config.description}
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <MonoChip text={`${config.total_sets} SETS`} color="blue" />
            <MonoChip text={`${config.reps_per_set} REPS`} color="dim" />
            <MonoChip text={`${config.hold_duration}S HOLD`} color="gold" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// HOLD PROGRESS RING
// ─────────────────────────────────────────────────────────────
function HoldRing({ progress, size = 60 }) {
  const r = (size - 6) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - progress)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r}
        stroke={progress >= 1 ? '#10B981' : '#F59E0B'}
        strokeWidth="4" fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// RESULTS VIEW
// ─────────────────────────────────────────────────────────────
function ResultsView({ result, onSave, onNewSession, saving }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}
    >
      <h2 style={{
        fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
        fontWeight: 300, fontSize: '36px', color: '#F0EDE6',
        margin: '0 0 24px', textAlign: 'center',
      }}>
        Session Complete
      </h2>

      {/* Summary stats */}
      <GlassCard>
        <div style={{ padding: '24px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px',
            textAlign: 'center',
          }}>
            <div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '28px',
                fontWeight: 500, color: '#C9A84C',
              }}>
                {result.total_reps}
              </div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '10px',
                letterSpacing: '0.1em', color: 'rgba(240,237,230,0.4)',
                textTransform: 'uppercase', marginTop: '4px',
              }}>
                TOTAL REPS
              </div>
            </div>
            <div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '28px',
                fontWeight: 500, color: '#C9A84C',
              }}>
                {result.avg_peak_angle}°
              </div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '10px',
                letterSpacing: '0.1em', color: 'rgba(240,237,230,0.4)',
                textTransform: 'uppercase', marginTop: '4px',
              }}>
                AVG PEAK
              </div>
            </div>
            <div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '28px',
                fontWeight: 500, color: '#C9A84C',
              }}>
                {result.duration_secs}s
              </div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '10px',
                letterSpacing: '0.1em', color: 'rgba(240,237,230,0.4)',
                textTransform: 'uppercase', marginTop: '4px',
              }}>
                DURATION
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Set breakdown */}
      {result.sets.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <GlassCard>
            <div style={{ padding: '20px' }}>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '10px',
                letterSpacing: '0.12em', color: 'rgba(240,237,230,0.4)',
                textTransform: 'uppercase', marginBottom: '12px',
              }}>
                SET BREAKDOWN
              </div>
              {result.sets.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: i < result.sets.length - 1
                    ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{
                    fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
                    color: '#F0EDE6',
                  }}>
                    Set {s.set}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <MonoChip text={`${s.reps} REPS`} color="gold" />
                    <MonoChip text={`${s.peakAngle}°`} color="blue" />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px',
      }}>
        <PillButton variant="outline" onClick={onNewSession}>
          NEW SESSION
        </PillButton>
        <PillButton variant="gold" onClick={onSave} loading={saving}>
          SAVE & EXIT
        </PillButton>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function PhysicalSession() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Guard: redirect if no physical exercises assigned
  const exercises = user?.assigned_exercises || []
  const hasPhysical = exercises.some(e => e === 'elbow_stretching' || e === 'lateral_raises')
  useEffect(() => {
    if (!hasPhysical) navigate('/patient/hub', { replace: true })
  }, [hasPhysical, navigate])

  // Phase: 'select' | 'loading' | 'active' | 'results' | 'error'
  const [phase, setPhase] = useState('select')
  const [activeExercise, setActiveExercise] = useState('')
  const [sessionState, setSessionState] = useState(null)
  const [sessionResult, setSessionResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const poseLandmarkerRef = useRef(null)
  const sessionRef = useRef(null)
  const animFrameRef = useRef(null)
  const streamRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      _stopEverything()
    }
  }, [])

  // Start render loop once canvas is in the DOM (phase === 'active')
  useEffect(() => {
    if (phase === 'active' && canvasRef.current && videoRef.current) {
      _renderLoop()
    }
  }, [phase])

  const _stopEverything = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (poseLandmarkerRef.current) {
      poseLandmarkerRef.current.close()
      poseLandmarkerRef.current = null
    }
  }

  // ── Start exercise session ─────────────────────────────────
  const handleSelectExercise = async (exerciseKey) => {
    setActiveExercise(exerciseKey)
    setPhase('loading')
    setErrorMsg('')

    try {
      // 1. Initialize MediaPipe PoseLandmarker
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
      poseLandmarkerRef.current = poseLandmarker

      // 2. Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      video.srcObject = stream
      await video.play()

      // 3. Create exercise session
      sessionRef.current = new ExerciseSession(exerciseKey)

      // 4. Transition to active — useEffect will start the render loop
      setPhase('active')

    } catch (err) {
      console.error('Failed to start exercise:', err)
      _stopEverything()
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera access and try again.'
          : err.message || 'Failed to start exercise session.'
      )
      setPhase('error')
    }
  }

  // ── Render loop ────────────────────────────────────────────
  const _renderLoop = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const poseLandmarker = poseLandmarkerRef.current
    const session = sessionRef.current

    if (!video || !canvas || !poseLandmarker || !session) return

    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const processFrame = () => {
      if (!videoRef.current || !poseLandmarkerRef.current || !sessionRef.current) return

      const now = performance.now()

      // Run pose detection
      const results = poseLandmarkerRef.current.detectForVideo(videoRef.current, now)

      // Draw camera feed (mirrored)
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(videoRef.current, 0, 0)
      ctx.restore()

      // Draw semi-transparent overlay at bottom for HUD
      ctx.fillStyle = 'rgba(8, 9, 15, 0.6)'
      ctx.fillRect(0, canvas.height - 80, canvas.width, 80)

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0]

        // Draw pose skeleton (mirrored)
        ctx.save()
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
        _drawSkeleton(ctx, landmarks, canvas.width, canvas.height)
        ctx.restore()

        // Process through exercise engine
        const state = sessionRef.current.processLandmarks(landmarks)
        setSessionState({ ...state })

        // Draw HUD overlay
        _drawHUD(ctx, state, canvas.width, canvas.height)

        // Check if completed
        if (state.completed) {
          const result = sessionRef.current.getResult()
          setSessionResult(result)
          setTimeout(() => {
            _stopEverything()
            setPhase('results')
          }, 500)
          return
        }
      } else {
        // No pose detected
        ctx.fillStyle = 'rgba(201,168,76,0.8)'
        ctx.font = '16px "DM Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Stand in frame — full upper body visible', canvas.width / 2, 40)
      }

      animFrameRef.current = requestAnimationFrame(processFrame)
    }

    animFrameRef.current = requestAnimationFrame(processFrame)
  }

  // ── Draw skeleton ──────────────────────────────────────────
  const _drawSkeleton = (ctx, landmarks, w, h) => {
    const config = EXERCISE_CONFIGS[activeExercise]
    if (!config) return

    // Draw all pose connections (subtle)
    const allConnections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
    ]

    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 2
    for (const [i, j] of allConnections) {
      const a = landmarks[i]
      const b = landmarks[j]
      if (a && b && a.visibility > 0.5 && b.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(a.x * w, a.y * h)
        ctx.lineTo(b.x * w, b.y * h)
        ctx.stroke()
      }
    }

    // Highlight exercise-specific connections
    ctx.strokeStyle = config.arc_color
    ctx.lineWidth = 4
    ctx.shadowColor = config.arc_color
    ctx.shadowBlur = 8
    for (const [i, j] of config.connections) {
      const a = landmarks[i]
      const b = landmarks[j]
      if (a && b && a.visibility > 0.5 && b.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(a.x * w, a.y * h)
        ctx.lineTo(b.x * w, b.y * h)
        ctx.stroke()
      }
    }
    ctx.shadowBlur = 0

    // Draw landmark dots
    for (const idx of config.landmarks) {
      const lm = landmarks[idx]
      if (lm && lm.visibility > 0.5) {
        ctx.beginPath()
        ctx.arc(lm.x * w, lm.y * h, 6, 0, 2 * Math.PI)
        ctx.fillStyle = config.arc_color
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
  }

  // ── Draw HUD ───────────────────────────────────────────────
  const _drawHUD = (ctx, state, w, h) => {
    if (!state) return

    const y = h - 60

    // State label
    const stateColor = STATE_COLORS[state.state] || '#6B7280'
    ctx.fillStyle = stateColor
    ctx.font = 'bold 14px "DM Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(STATE_LABELS[state.state] || state.state, 20, y)

    // Angle
    ctx.fillStyle = '#C9A84C'
    ctx.font = 'bold 20px "DM Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`${state.angle}°`, 20, y + 30)

    // Reps counter (center)
    ctx.fillStyle = '#F0EDE6'
    ctx.font = 'bold 24px "DM Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`${state.reps} / ${state.repsTarget}`, w / 2, y + 10)

    ctx.fillStyle = 'rgba(240,237,230,0.4)'
    ctx.font = '12px "DM Mono", monospace'
    ctx.fillText(`SET ${state.currentSet} / ${state.totalSets}`, w / 2, y + 32)

    // Hold progress bar (right side)
    if (state.state === STATES.HOLDING || state.holdProgress > 0) {
      const barW = 120
      const barH = 8
      const barX = w - barW - 20
      const barY = y + 4

      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.fillRect(barX, barY, barW, barH)

      ctx.fillStyle = state.holdProgress >= 1 ? '#10B981' : '#F59E0B'
      ctx.fillRect(barX, barY, barW * state.holdProgress, barH)

      ctx.fillStyle = 'rgba(240,237,230,0.5)'
      ctx.font = '10px "DM Mono", monospace'
      ctx.textAlign = 'right'
      ctx.fillText('HOLD', w - 20, barY - 4)
    }

    // Cooldown overlay
    if (state.phase === 'cooldown') {
      ctx.fillStyle = 'rgba(8, 9, 15, 0.7)'
      ctx.fillRect(0, 0, w, h - 80)

      ctx.fillStyle = '#C9A84C'
      ctx.font = 'bold 48px "DM Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(state.cooldownRemaining, w / 2, h / 2)

      ctx.fillStyle = 'rgba(240,237,230,0.5)'
      ctx.font = '14px "DM Mono", monospace'
      ctx.fillText('REST — NEXT SET STARTING SOON', w / 2, h / 2 + 40)
    }
  }

  // ── End session ────────────────────────────────────────────
  const handleEndSession = () => {
    if (sessionRef.current) {
      sessionRef.current.endSession()
      const result = sessionRef.current.getResult()
      setSessionResult(result)
    }
    _stopEverything()
    setPhase('results')
  }

  // ── Save results ───────────────────────────────────────────
  const handleSave = async () => {
    if (!sessionResult) return
    setSaving(true)

    try {
      // Save directly to Django (no CV API proxy needed)
      const exercise = sessionResult.exercise
      const totalReps = sessionResult.total_reps
      const avgPeak = sessionResult.avg_peak_angle

      // Compute accuracy
      let accuracy = 50
      if (exercise === 'elbow_stretching') {
        accuracy = Math.max(0, Math.min(100, (180 - avgPeak) / 1.5))
      } else if (exercise === 'lateral_raises') {
        accuracy = Math.max(0, Math.min(100, avgPeak / 0.9))
      }

      await authFetch('/api/rehab-sessions/', {
        method: 'POST',
        body: JSON.stringify({
          session_date: new Date().toISOString().slice(0, 10),
          total_reps: totalReps,
          avg_accuracy_pct: Math.round(accuracy * 10) / 10,
          completed: true,
        }),
      })

      navigate('/patient/hub')
    } catch (err) {
      console.error('Failed to save session:', err)
      setErrorMsg('Failed to save: ' + (err.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  // ── New session ────────────────────────────────────────────
  const handleNewSession = () => {
    setPhase('select')
    setActiveExercise('')
    setSessionResult(null)
    setSessionState(null)
    setErrorMsg('')
  }

  return (
    <div style={{ background: '#08090F', minHeight: '100vh' }}>

      {/* Hidden video element — must always be in DOM for camera init */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* ── LOADING PHASE ── */}
      {phase === 'loading' && <LoadingVoid text="initializing camera & pose detection..." />}

      {/* ── ERROR PHASE ── */}
      {phase === 'error' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <MonoChip text="ERROR" color="red" />
            <p style={{
              fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
              color: 'rgba(240,237,230,0.6)', marginTop: '16px', lineHeight: 1.6,
            }}>
              {errorMsg}
            </p>
            <PillButton variant="gold" onClick={handleNewSession}>
              TRY AGAIN
            </PillButton>
          </div>
        </div>
      )}

      {/* ── SELECT PHASE ── */}
      {phase === 'select' && (
        <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/patient/hub')}
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
            ← BACK
          </button>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 style={{
              fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
              fontWeight: 300, fontSize: 'clamp(32px, 5vw, 48px)',
              color: '#F0EDE6', margin: '20px 0 4px',
            }}>
              Physical Session
            </h1>
            <p style={{
              fontFamily: '"DM Mono", monospace', fontSize: '11px',
              letterSpacing: '0.1em', color: 'rgba(240,237,230,0.3)',
              textTransform: 'uppercase', margin: '0 0 32px',
            }}>
              SELECT AN EXERCISE TO BEGIN
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(EXERCISE_CONFIGS).map(([key, config], i) => (
                <ExerciseCard
                  key={key}
                  exerciseKey={key}
                  config={config}
                  onSelect={handleSelectExercise}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── ACTIVE PHASE (camera + tracking) ── */}
      {phase === 'active' && (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

          {/* Canvas with camera + overlay */}
          <canvas
            ref={canvasRef}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {/* Top-left: exercise name */}
          <div style={{
            position: 'absolute', top: '16px', left: '16px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <MonoChip
              text={EXERCISE_CONFIGS[activeExercise]?.display_name.toUpperCase() || activeExercise}
              color="gold"
            />
          </div>

          {/* Top-right: End Session button */}
          <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
            <PillButton variant="outline" onClick={handleEndSession}>
              END SESSION
            </PillButton>
          </div>

          {/* ── Exercise Demo GIF (bottom-left) ── */}
          {(() => {
            const gifMap = {
              elbow_stretching: '/gifs/curl_gif.gif',
              lateral_raises: '/gifs/shoulder.gif',
            }
            const gifSrc = gifMap[activeExercise]
            if (!gifSrc) return null
            return (
              <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '24px',
                width: '240px',
                background: 'rgba(8,9,15,0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '16px',
                border: '1px solid rgba(201,168,76,0.15)',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <div style={{
                  padding: '8px 12px 4px',
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '9px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(201,168,76,0.7)',
                }}>
                  HOW TO PERFORM
                </div>
                <img
                  src={gifSrc}
                  alt="Exercise demonstration"
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    display: 'block',
                    borderRadius: '0 0 16px 16px',
                  }}
                />
              </div>
            )
          })()}

          {/* Hold progress ring (shown during HOLDING state) */}
          {sessionState?.state === STATES.HOLDING && (
            <div style={{
              position: 'absolute', top: '50%', right: '40px',
              transform: 'translateY(-50%)',
            }}>
              <HoldRing progress={sessionState.holdProgress} size={80} />
              <div style={{
                textAlign: 'center', marginTop: '8px',
                fontFamily: '"DM Mono", monospace', fontSize: '12px',
                color: '#F59E0B', letterSpacing: '0.1em',
              }}>
                HOLD
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS PHASE ── */}
      {phase === 'results' && sessionResult && (
        <ResultsView
          result={sessionResult}
          onSave={handleSave}
          onNewSession={handleNewSession}
          saving={saving}
        />
      )}
    </div>
  )
}
