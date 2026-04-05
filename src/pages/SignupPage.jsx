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

// ── Password Eye Toggle Button ───────────────────────────────
function EyeToggle({ show, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
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
            aria-label={show ? 'Hide password' : 'Show password'}
        >
            {show ? <EyeClosedIcon /> : <EyeOpenIcon />}
        </button>
    )
}

// ── Main SignupPage (Doctor-Only) ─────────────────────────────
export default function SignupPage() {
    const navigate = useNavigate()
    const { signup } = useAuthStore()

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    const validate = () => {
        if (!fullName.trim()) return 'Please enter your full name.'
        if (!email.trim()) return 'Please enter your email address.'
        if (password.length < 6) return 'Password must be at least 6 characters.'
        if (password !== confirmPassword) return 'Passwords do not match.'
        return null
    }

    const handleSubmit = async (e) => {
        e?.preventDefault()

        const validationError = validate()
        if (validationError) {
            setErrorMsg(validationError)
            return
        }

        setIsLoading(true)
        setErrorMsg('')
        setSuccessMsg('')

        try {
            await signup(fullName.trim(), email.trim(), password)
            setSuccessMsg('Doctor account created! Redirecting to sign in…')
            setTimeout(() => navigate('/auth'), 1500)
        } catch (err) {
            setErrorMsg(err?.message || 'An unexpected error occurred. Please try again.')
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
                                DOCTOR / CAREGIVER REGISTRATION
                            </p>
                        </div>

                        {/* ── Divider ── */}
                        <div style={{
                            height: '1px',
                            background: 'rgba(255,255,255,0.07)',
                            margin: '28px 0',
                        }} />

                        {/* ── Form Fields ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Full Name */}
                            <AuthInput
                                label="Full Name"
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                autoComplete="name"
                                placeholder=""
                            />

                            {/* Email */}
                            <AuthInput
                                label="Email Address"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                            />

                            {/* Password */}
                            <AuthInput
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="new-password"
                                rightElement={
                                    <EyeToggle
                                        show={showPassword}
                                        onToggle={() => setShowPassword(v => !v)}
                                    />
                                }
                            />

                            {/* Confirm Password */}
                            <AuthInput
                                label="Confirm Password"
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                rightElement={
                                    <EyeToggle
                                        show={showConfirm}
                                        onToggle={() => setShowConfirm(v => !v)}
                                    />
                                }
                            />

                            {/* Info note */}
                            <div style={{
                                padding: '12px 14px',
                                borderRadius: '8px',
                                background: 'rgba(201,168,76,0.06)',
                                border: '1px solid rgba(201,168,76,0.15)',
                            }}>
                                <p style={{
                                    fontFamily: '"DM Sans", sans-serif',
                                    fontSize: '12px',
                                    color: 'rgba(240,237,230,0.5)',
                                    margin: 0,
                                    lineHeight: 1.5,
                                }}>
                                    This registration is for <strong style={{ color: '#C9A84C' }}>doctors and caregivers</strong> only.
                                    Patients are registered by their doctor from the Doctor Portal.
                                </p>
                            </div>

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

                            {/* Success chip */}
                            <AnimatePresence>
                                {successMsg && (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ display: 'flex', alignItems: 'center' }}
                                    >
                                        <MonoChip text={successMsg} color="gold" />
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
                                    Create Doctor Account
                                </PillButton>
                            </div>

                        </div>
                    </form>
                </GlassCard>

                {/* ── Footer link ── */}
                <p style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '13px',
                    color: 'rgba(240,237,230,0.35)',
                    textAlign: 'center',
                    marginTop: '20px',
                }}>
                    Already have an account?{' '}
                    <button
                        onClick={() => navigate('/auth')}
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
                        Sign In →
                    </button>
                </p>
            </motion.div>
        </div>
    )
}
