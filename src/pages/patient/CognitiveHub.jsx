import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { authFetch } from '../../lib/api'
import useAuthStore from '../../store/authStore'
import GlassCard from '../../components/ui/GlassCard'
import PillButton from '../../components/ui/PillButton'
import MonoChip from '../../components/ui/MonoChip'

// ─────────────────────────────────────────────────────────────
// GAME REGISTRY
// ─────────────────────────────────────────────────────────────
const GAMES = [
  {
    key: 'memory_constellation',
    name: 'Memory Constellation',
    description: 'Watch the sequence of tiles light up, then repeat it from memory. Tests pattern recall and working memory.',
    icon: '🌟',
    file: '/games/memory-constellation.html',
    metrics: ['Cog Score', 'Accuracy', 'Best Level'],
    color: '#C9A84C',
  },
  {
    key: 'number_tap',
    name: 'Number Tap',
    description: 'Numbers appear in random positions — memorise them, then tap in order from 1 upward. Tests spatial memory.',
    icon: '🧠',
    file: '/games/number-tap.html',
    metrics: ['Cog Score', 'Accuracy', 'Best Level'],
    color: '#4A6FA5',
  },
  {
    key: 'reaction_flash',
    name: 'Reaction Flash',
    description: 'A colored circle flashes — tap the matching color button as fast as you can. Tests reaction speed and attention.',
    icon: '⚡',
    file: '/games/reaction-flash.html',
    metrics: ['Cog Score', 'Avg Time', 'Best Time'],
    color: '#4AA59A',
  },
]

// ─────────────────────────────────────────────────────────────
// GAME CARD
// ─────────────────────────────────────────────────────────────
function GameCard({ game, onSelect, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <GlassCard goldHover onClick={() => onSelect(game)}>
        <div style={{ padding: '24px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <span style={{ fontSize: '28px' }}>{game.icon}</span>
            <div style={{
              fontFamily: '"DM Sans", sans-serif', fontSize: '16px',
              fontWeight: 600, color: '#F0EDE6',
            }}>
              {game.name}
            </div>
          </div>
          <p style={{
            fontFamily: '"DM Sans", sans-serif', fontSize: '13px',
            color: 'rgba(240,237,230,0.5)', margin: '0 0 14px', lineHeight: 1.5,
          }}>
            {game.description}
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {game.metrics.map(m => (
              <MonoChip key={m} text={m.toUpperCase()} color="dim" />
            ))}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// RESULT OVERLAY
// ─────────────────────────────────────────────────────────────
function ResultOverlay({ result, game, onSave, onClose, saving }) {
  if (!result || !game) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(8,9,15,0.9)', backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px', padding: '40px',
          maxWidth: '420px', width: '100%', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>{game.icon}</div>

        <h2 style={{
          fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
          fontWeight: 300, fontSize: '28px', color: '#C9A84C', margin: '0 0 8px',
        }}>
          Game Complete
        </h2>

        <p style={{
          fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
          color: 'rgba(240,237,230,0.5)', margin: '0 0 20px',
        }}>
          {game.name}
        </p>

        {/* Score display */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '12px', marginBottom: '24px',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', padding: '14px',
          }}>
            <div style={{
              fontFamily: '"DM Mono", monospace', fontSize: '24px',
              fontWeight: 500, color: '#C9A84C',
            }}>
              {result.cogScore}%
            </div>
            <div style={{
              fontFamily: '"DM Mono", monospace', fontSize: '9px',
              letterSpacing: '0.12em', color: 'rgba(240,237,230,0.4)',
              textTransform: 'uppercase', marginTop: '4px',
            }}>
              COG SCORE
            </div>
          </div>

          {result.accuracy !== undefined && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px', padding: '14px',
            }}>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '24px',
                fontWeight: 500, color: '#F0EDE6',
              }}>
                {result.accuracy}%
              </div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '9px',
                letterSpacing: '0.12em', color: 'rgba(240,237,230,0.4)',
                textTransform: 'uppercase', marginTop: '4px',
              }}>
                ACCURACY
              </div>
            </div>
          )}

          {result.bestLevel !== undefined && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px', padding: '14px',
            }}>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '24px',
                fontWeight: 500, color: '#4A6FA5',
              }}>
                L{result.bestLevel}
              </div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '9px',
                letterSpacing: '0.12em', color: 'rgba(240,237,230,0.4)',
                textTransform: 'uppercase', marginTop: '4px',
              }}>
                BEST LEVEL
              </div>
            </div>
          )}

          {result.avgTime !== undefined && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px', padding: '14px',
            }}>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '24px',
                fontWeight: 500, color: '#4AA59A',
              }}>
                {result.avgTime}ms
              </div>
              <div style={{
                fontFamily: '"DM Mono", monospace', fontSize: '9px',
                letterSpacing: '0.12em', color: 'rgba(240,237,230,0.4)',
                textTransform: 'uppercase', marginTop: '4px',
              }}>
                AVG TIME
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <PillButton variant="outline" onClick={onClose}>
            PLAY AGAIN
          </PillButton>
          <PillButton variant="gold" onClick={onSave} loading={saving}>
            SAVE & EXIT
          </PillButton>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function CognitiveHub() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Guard: redirect if cognitive_rehab not assigned
  const hasCognitive = (user?.assigned_exercises || []).includes('cognitive_rehab')
  useEffect(() => {
    if (!hasCognitive) navigate('/patient/hub', { replace: true })
  }, [hasCognitive, navigate])

  // Phase: 'select' | 'playing' | 'result'
  const [phase, setPhase] = useState('select')
  const [activeGame, setActiveGame] = useState(null)
  const [gameResult, setGameResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const iframeRef = useRef(null)

  // Listen for postMessage from game iframes
  useEffect(() => {
    const handler = (event) => {
      if (event.data && event.data.type === 'GAME_RESULT') {
        setGameResult(event.data.data)
        setPhase('result')
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleSelectGame = (game) => {
    setActiveGame(game)
    setGameResult(null)
    setPhase('playing')
  }

  const handleSave = async () => {
    if (!gameResult || !activeGame) return
    setSaving(true)

    try {
      await authFetch('/api/cognitive-sessions/', {
        method: 'POST',
        body: JSON.stringify({
          game_name: activeGame.key,
          cog_score: gameResult.cogScore || 0,
          level_reached: gameResult.bestLevel || gameResult.rounds || 0,
        }),
      })
      navigate('/patient/hub')
    } catch (err) {
      console.error('Failed to save cognitive session:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setGameResult(null)
    setPhase('playing')
    // Reload the iframe to restart the game
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
    }
  }

  const handleBack = () => {
    setPhase('select')
    setActiveGame(null)
    setGameResult(null)
  }

  return (
    <div style={{ background: '#08090F', minHeight: '100vh' }}>

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
              Cognitive Training
            </h1>
            <p style={{
              fontFamily: '"DM Mono", monospace', fontSize: '11px',
              letterSpacing: '0.1em', color: 'rgba(240,237,230,0.3)',
              textTransform: 'uppercase', margin: '0 0 32px',
            }}>
              SELECT A GAME TO BEGIN
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {GAMES.map((game, i) => (
                <GameCard
                  key={game.key}
                  game={game}
                  onSelect={handleSelectGame}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── PLAYING PHASE (iframe) ── */}
      {(phase === 'playing' || phase === 'result') && activeGame && (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>

          {/* Back button overlay */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px', zIndex: 10,
          }}>
            <PillButton variant="outline" onClick={handleBack}>
              ← EXIT GAME
            </PillButton>
          </div>

          {/* Game iframe */}
          <iframe
            ref={iframeRef}
            src={activeGame.file}
            title={activeGame.name}
            style={{
              width: '100%', height: '100%', border: 'none',
              background: '#08090F',
            }}
            allow="autoplay"
          />

          {/* Result overlay */}
          <AnimatePresence>
            {phase === 'result' && gameResult && (
              <ResultOverlay
                result={gameResult}
                game={activeGame}
                onSave={handleSave}
                onClose={handleClose}
                saving={saving}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
