import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../store/authStore'
import GlassCard from '../components/ui/GlassCard'
import PillButton from '../components/ui/PillButton'
import MonoChip from '../components/ui/MonoChip'

// ── Eye Toggle SVG Icons ─────────────────────────────────────
function EyeOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ── Styled Input ─────────────────────────────────────────────
function AuthInput({ label, type, value, onChange, autoComplete, rightElement, placeholder }) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontFamily: '"DM Mono", monospace',
        fontSize: '11px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'rgba(240,237,230,0.5)',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: focused
              ? '1px solid #C9A84C'
              : '1px solid rgba(255,255,255,0.1)',
            boxShadow: focused
              ? '0 0 0 2px rgba(201,168,76,0.12)'
              : 'none',
            borderRadius: '8px',
            padding: rightElement ? '14px 48px 14px 16px' : '14px 16px',
            color: '#F0EDE6',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '15px',
            outline: 'none',
            transition: 'border-color 200ms ease, box-shadow 200ms ease',
            boxSizing: 'border-box',
          }}
        />
        {rightElement && (
          <div style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
          }}>
            {rightElement}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Role Toggle (Doctor / Patient) ───────────────────────────
function LoginModeToggle({ mode, setMode }) {
  const modes = [
    { value: 'doctor', label: 'Doctor / Caregiver' },
    { value: 'patient', label: 'Patient' },
  ]

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      {modes.map((m) => {
        const isActive = mode === m.value
        return (
          <motion.button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: '"DM Mono", monospace',
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              outline: 'none',
              transition: 'all 200ms ease',
              background: isActive
                ? 'rgba(201,168,76,0.12)'
                : 'rgba(255,255,255,0.03)',
              border: isActive
                ? '1px solid rgba(201,168,76,0.5)'
                : '1px solid rgba(255,255,255,0.1)',
              color: isActive
                ? '#C9A84C'
                : 'rgba(240,237,230,0.4)',
              boxShadow: isActive
                ? '0 0 12px rgba(201,168,76,0.08)'
                : 'none',
            }}
          >
            {m.label}
          </motion.button>
        )
      })}
    </div>
  )
}

// ── Main AuthPage ─────────────────────────────────────────────
export default function AuthPage() {
  const navigate = useNavigate()
  const { login, patientLogin } = useAuthStore()

  const [loginMode, setLoginMode] = useState('doctor') // 'doctor' | 'patient'
  const [email, setEmail] = useState('')
  const [patientId, setPatientId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setErrorMsg('')

    if (loginMode === 'doctor') {
      if (!email || !password) {
        setErrorMsg('Please enter your email and password.')
        return
      }
    } else {
      if (!patientId || !password) {
        setErrorMsg('Please enter your Patient ID and password.')
        return
      }
    }

    setIsLoading(true)

    try {
      if (loginMode === 'doctor') {
        const { role } = await login(email, password)
        if (role === 'doctor') {
          navigate('/doctor/dashboard')
        } else {
          navigate('/patient/hub')
        }
      } else {
        await patientLogin(patientId.trim(), password)
        navigate('/patient/hub')
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Invalid credentials. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08090F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '24px',
    }}>

      {/* ── Back link ── */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'absolute',
          top: '28px',
          left: '28px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: '"DM Mono", monospace',
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(201,168,76,0.7)',
          padding: '4px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'color 200ms ease',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(201,168,76,0.7)'}
      >
        ← BACK
      </button>

      {/* ── Animated Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '440px' }}
      >
        <GlassCard>
          <form
            onSubmit={handleSubmit}
            style={{ padding: '48px' }}
            noValidate
          >

            {/* ── Header ── */}
            <div style={{ textAlign: 'center', marginBottom: '0' }}>
              <h1 style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: '52px',
                color: '#F0EDE6',
                lineHeight: 1.1,
                margin: 0,
              }}>
                RehabAI
              </h1>
              <p style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(240,237,230,0.3)',
                marginTop: '10px',
                marginBottom: 0,
              }}>
                NAKSHATRA-01 · SECURE ACCESS
              </p>
            </div>

            {/* ── Divider ── */}
            <div style={{
              height: '1px',
              background: 'rgba(255,255,255,0.07)',
              margin: '28px 0',
            }} />

            {/* ── Login Mode Toggle ── */}
            <div style={{ marginBottom: '24px' }}>
              <LoginModeToggle mode={loginMode} setMode={(m) => {
                setLoginMode(m)
                setErrorMsg('')
              }} />
            </div>

            {/* ── Form Fields ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <AnimatePresence mode="wait">
                {loginMode === 'doctor' ? (
                  <motion.div
                    key="doctor-fields"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                  >
                    <AuthInput
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="patient-fields"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                  >
                    <AuthInput
                      label="Patient ID"
                      type="text"
                      value={patientId}
                      onChange={e => setPatientId(e.target.value)}
                      autoComplete="username"
                      placeholder="e.g. NK-12345"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Password */}
              <AuthInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(240,237,230,0.4)',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 200ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,237,230,0.4)'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                  </button>
                }
              />

              {/* Error chip */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <MonoChip text={errorMsg} color="red" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <div style={{ marginTop: '8px' }}>
                <PillButton
                  variant="gold"
                  loading={isLoading}
                  onClick={handleSubmit}
                  fullWidth
                >
                  Access Portal
                </PillButton>
              </div>

            </div>
          </form>
        </GlassCard>

        {/* ── Footer text ── */}
        <p style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '12px',
          color: 'rgba(240,237,230,0.3)',
          textAlign: 'center',
          marginTop: '20px',
        }}>
          {loginMode === 'patient'
            ? 'Your Patient ID and password are provided by your doctor.'
            : 'Access is provided by your healthcare administrator.'
          }
        </p>
        <p style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '13px',
          color: 'rgba(240,237,230,0.35)',
          textAlign: 'center',
          marginTop: '8px',
        }}>
          {loginMode === 'doctor' && (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '13px',
                  color: '#C9A84C',
                  padding: 0,
                  textDecoration: 'none',
                  transition: 'opacity 200ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Sign Up →
              </button>
            </>
          )}
        </p>
      </motion.div>
    </div>
  )
}
