import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiExtractDischarge, apiRegisterPatient } from '../../lib/api'
import GlassCard from '../../components/ui/GlassCard'
import PillButton from '../../components/ui/PillButton'
import MonoChip from '../../components/ui/MonoChip'

// ─────────────────────────────────────────────────────────────
// STYLED INPUT (shared)
// ─────────────────────────────────────────────────────────────
function FormInput({ label, type = 'text', value, onChange, placeholder = '', disabled = false }) {
    const [focused, setFocused] = useState(false)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
                fontFamily: '"DM Mono", monospace', fontSize: '10px',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(240,237,230,0.5)',
            }}>
                {label}
            </label>
            <input
                type={type}
                value={value || ''}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                    width: '100%',
                    background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                    border: focused ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: focused ? '0 0 0 2px rgba(201,168,76,0.12)' : 'none',
                    borderRadius: '8px', padding: '12px 14px',
                    color: disabled ? 'rgba(240,237,230,0.3)' : '#F0EDE6',
                    fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
                    outline: 'none', transition: 'all 200ms ease', boxSizing: 'border-box',
                }}
            />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE DISPLAY NAME MAP
// ─────────────────────────────────────────────────────────────
const EXERCISE_NAMES = {
    elbow_stretching: 'Elbow Stretching',
    lateral_raises: 'Lateral Raises',
    cognitive_rehab: 'Cognitive Rehabilitation',
}

// ─────────────────────────────────────────────────────────────
// UPLOAD ZONE
// ─────────────────────────────────────────────────────────────
function UploadZone({ onFileSelect, file, loading }) {
    const inputRef = useRef(null)
    const [dragOver, setDragOver] = useState(false)

    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onFileSelect(f)
    }

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !loading && inputRef.current?.click()}
            style={{
                border: dragOver
                    ? '2px dashed #C9A84C'
                    : '2px dashed rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '40px 24px',
                textAlign: 'center',
                cursor: loading ? 'wait' : 'pointer',
                background: dragOver ? 'rgba(201,168,76,0.04)' : 'rgba(255,255,255,0.01)',
                transition: 'all 200ms ease',
            }}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onFileSelect(f)
                }}
            />

            {loading ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        style={{
                            width: 40, height: 40, borderRadius: '50%',
                            border: '2px solid rgba(201,168,76,0.15)',
                            borderTop: '2px solid #C9A84C',
                        }}
                    />
                    <span style={{
                        fontFamily: '"DM Mono", monospace', fontSize: '11px',
                        letterSpacing: '0.1em', color: '#C9A84C', textTransform: 'uppercase',
                    }}>
                        Analyzing with AI...
                    </span>
                </motion.div>
            ) : file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <MonoChip text="FILE SELECTED" color="gold" />
                    <span style={{
                        fontFamily: '"DM Sans", sans-serif', fontSize: '13px',
                        color: 'rgba(240,237,230,0.6)',
                    }}>
                        {file.name}
                    </span>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {/* Upload icon */}
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(240,237,230,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span style={{
                        fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
                        color: 'rgba(240,237,230,0.5)',
                    }}>
                        Drop discharge summary here or <span style={{ color: '#C9A84C' }}>browse</span>
                    </span>
                    <span style={{
                        fontFamily: '"DM Mono", monospace', fontSize: '10px',
                        letterSpacing: '0.1em', color: 'rgba(240,237,230,0.25)',
                        textTransform: 'uppercase',
                    }}>
                        PDF · WORD · PNG · JPEG
                    </span>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// SUCCESS VIEW
// ─────────────────────────────────────────────────────────────
function SuccessView({ patientId, patientName, onDone }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{ maxWidth: 500, margin: '0 auto' }}
        >
            <GlassCard>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    {/* Check icon */}
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'rgba(76,175,130,0.1)',
                        border: '1px solid rgba(76,175,130,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4CAF82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>

                    <h2 style={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontStyle: 'italic', fontWeight: 300,
                        fontSize: '32px', color: '#F0EDE6', margin: '0 0 8px',
                    }}>
                        Patient Registered
                    </h2>
                    <p style={{
                        fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
                        color: 'rgba(240,237,230,0.5)', margin: '0 0 24px',
                    }}>
                        {patientName} has been successfully registered.
                    </p>

                    {/* Patient ID display */}
                    <div style={{
                        padding: '16px', borderRadius: '10px',
                        background: 'rgba(201,168,76,0.08)',
                        border: '1px solid rgba(201,168,76,0.2)',
                        marginBottom: '24px',
                    }}>
                        <div style={{
                            fontFamily: '"DM Mono", monospace', fontSize: '10px',
                            letterSpacing: '0.12em', color: 'rgba(240,237,230,0.4)',
                            textTransform: 'uppercase', marginBottom: '6px',
                        }}>
                            ASSIGNED PATIENT ID
                        </div>
                        <div style={{
                            fontFamily: '"DM Mono", monospace', fontSize: '28px',
                            fontWeight: 600, color: '#C9A84C', letterSpacing: '0.05em',
                        }}>
                            {patientId}
                        </div>
                        <div style={{
                            fontFamily: '"DM Sans", sans-serif', fontSize: '11px',
                            color: 'rgba(240,237,230,0.35)', marginTop: '8px',
                        }}>
                            Share this ID and the password with the patient for login.
                        </div>
                    </div>

                    <PillButton variant="gold" onClick={onDone}>
                        BACK TO DASHBOARD
                    </PillButton>
                </div>
            </GlassCard>
        </motion.div>
    )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function RegisterPatientPage() {
    const navigate = useNavigate()

    // Phase: 'upload' | 'review' | 'success'
    const [phase, setPhase] = useState('upload')

    // Upload state
    const [file, setFile] = useState(null)
    const [extracting, setExtracting] = useState(false)
    const [extractError, setExtractError] = useState('')

    // Form state (pre-filled by Gemini)
    const [fullName, setFullName] = useState('')
    const [age, setAge] = useState('')
    const [gender, setGender] = useState('')
    const [injuryType, setInjuryType] = useState('')
    const [injuryDetails, setInjuryDetails] = useState('')
    const [assignedExercises, setAssignedExercises] = useState([])
    const [exercisePlan, setExercisePlan] = useState({
        sessions_per_day: 1, sets: 3, reps_per_set: 10,
        hold_secs: 2, break_between_exercises_secs: 60,
    })
    const [password, setPassword] = useState('')
    const [dischargeSummaryText, setDischargeSummaryText] = useState('')

    // Submit state
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    // Success state
    const [createdPatientId, setCreatedPatientId] = useState('')

    // Handle file upload → Gemini extraction
    const handleFileSelect = async (selectedFile) => {
        setFile(selectedFile)
        setExtractError('')
        setExtracting(true)

        try {
            const data = await apiExtractDischarge(selectedFile)

            // Pre-fill form with extracted data
            setFullName(data.full_name || '')
            setAge(data.age != null ? String(data.age) : '')
            setGender(data.gender || '')
            setInjuryType(data.injury_type || '')
            setInjuryDetails(data.injury_details || '')
            setAssignedExercises(data.suggested_exercises || [])
            if (data.exercise_plan) setExercisePlan(data.exercise_plan)
            setDischargeSummaryText(JSON.stringify(data, null, 2))

            setPhase('review')
        } catch (err) {
            setExtractError(err.message || 'Failed to extract discharge summary.')
        }
        setExtracting(false)
    }

    // Skip upload → manual entry
    const handleManualEntry = () => {
        setPhase('review')
    }

    // Submit patient registration
    const handleSubmit = async () => {
        if (!fullName.trim()) {
            setSaveError('Patient name is required.')
            return
        }
        if (!password || password.length < 6) {
            setSaveError('Password must be at least 6 characters.')
            return
        }

        setSaving(true)
        setSaveError('')

        try {
            const result = await apiRegisterPatient({
                full_name: fullName.trim(),
                password,
                age: age ? parseInt(age) : null,
                gender,
                injury_type: injuryType,
                injury_details: injuryDetails,
                assigned_exercises: assignedExercises,
                exercise_plan: exercisePlan,
                discharge_summary_text: dischargeSummaryText,
            })

            setCreatedPatientId(result.patient_id)
            setPhase('success')
        } catch (err) {
            setSaveError(err.message || 'Failed to register patient.')
        }
        setSaving(false)
    }

    // Toggle an exercise in the assigned list
    const toggleExercise = (key) => {
        setAssignedExercises(prev =>
            prev.includes(key), prev.filter(k => k !== key), [...prev, key]
        )
    }

    return (
        <div style={{
            background: '#08090F', minHeight: '100vh',
            padding: '32px', maxWidth: '700px', margin: '0 auto',
            boxSizing: 'border-box',
        }}>

            {/* Back link */}
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
                ← DASHBOARD
            </button>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <h1 style={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontStyle: 'italic', fontWeight: 300,
                    fontSize: 'clamp(32px, 5vw, 48px)',
                    color: '#F0EDE6', margin: '20px 0 4px', lineHeight: 1.1,
                }}>
                    Register Patient
                </h1>
                <p style={{
                    fontFamily: '"DM Mono", monospace', fontSize: '11px',
                    letterSpacing: '0.1em', color: 'rgba(240,237,230,0.3)',
                    textTransform: 'uppercase', margin: '0 0 32px',
                }}>
                    {phase === 'upload' && 'UPLOAD DISCHARGE SUMMARY'}
                    {phase === 'review' && 'REVIEW & CONFIRM'}
                    {phase === 'success' && 'REGISTRATION COMPLETE'}
                </p>
            </motion.div>

            <AnimatePresence mode="wait">

                {/* ── UPLOAD PHASE ── */}
                {phase === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <GlassCard>
                            <div style={{ padding: '28px' }}>
                                <UploadZone
                                    onFileSelect={handleFileSelect}
                                    file={file}
                                    loading={extracting}
                                />

                                {extractError && (
                                    <div style={{ marginTop: '16px' }}>
                                        <MonoChip text={extractError} color="red" />
                                    </div>
                                )}

                                {/* Manual entry option */}
                                <div style={{
                                    marginTop: '20px', textAlign: 'center',
                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                    paddingTop: '16px',
                                }}>
                                    <button
                                        onClick={handleManualEntry}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            fontFamily: '"DM Sans", sans-serif', fontSize: '13px',
                                            color: 'rgba(240,237,230,0.4)',
                                            transition: 'color 200ms',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,237,230,0.4)'}
                                    >
                                        Or enter patient details manually →
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* ── REVIEW PHASE ── */}
                {phase === 'review' && (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                    >
                        {/* Patient Info */}
                        <GlassCard>
                            <div style={{ padding: '24px' }}>
                                <div style={{
                                    fontFamily: '"DM Mono", monospace', fontSize: '10px',
                                    letterSpacing: '0.12em', textTransform: 'uppercase',
                                    color: 'rgba(240,237,230,0.4)', marginBottom: '16px',
                                }}>
                                    PATIENT INFORMATION
                                    {file && (
                                        <MonoChip text="AI EXTRACTED" color="gold" />
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <FormInput
                                            label="Full Name"
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            placeholder="Patient's full name"
                                        />
                                    </div>
                                    <FormInput
                                        label="Age"
                                        type="number"
                                        value={age}
                                        onChange={e => setAge(e.target.value)}
                                        placeholder="e.g. 45"
                                    />
                                    <FormInput
                                        label="Gender"
                                        value={gender}
                                        onChange={e => setGender(e.target.value)}
                                        placeholder="e.g. male / female"
                                    />
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <FormInput
                                            label="Injury Type"
                                            value={injuryType}
                                            onChange={e => setInjuryType(e.target.value)}
                                            placeholder="e.g. Shoulder injury"
                                        />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{
                                                fontFamily: '"DM Mono", monospace', fontSize: '10px',
                                                letterSpacing: '0.12em', textTransform: 'uppercase',
                                                color: 'rgba(240,237,230,0.5)',
                                            }}>
                                                Injury Details
                                            </label>
                                            <textarea
                                                value={injuryDetails}
                                                onChange={e => setInjuryDetails(e.target.value)}
                                                placeholder="Details about the injury and treatment..."
                                                rows={3}
                                                style={{
                                                    width: '100%', background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '8px', padding: '12px 14px',
                                                    color: '#F0EDE6', fontFamily: '"DM Sans", sans-serif',
                                                    fontSize: '14px', outline: 'none', resize: 'vertical',
                                                    boxSizing: 'border-box',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Assigned Exercises */}
                        <GlassCard>
                            <div style={{ padding: '24px' }}>
                                <div style={{
                                    fontFamily: '"DM Mono", monospace', fontSize: '10px',
                                    letterSpacing: '0.12em', textTransform: 'uppercase',
                                    color: 'rgba(240,237,230,0.4)', marginBottom: '16px',
                                }}>
                                    ASSIGNED EXERCISES
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {Object.entries(EXERCISE_NAMES).map(([key, name]) => {
                                        const isActive = assignedExercises.includes(key)
                                        return (
                                            <motion.button
                                                key={key}
                                                type="button"
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => {
                                                    setAssignedExercises(prev =>
                                                        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                                                    )
                                                }}
                                                style={{
                                                    display: 'flex', justifyContent: 'space-between',
                                                    alignItems: 'center', padding: '14px 16px',
                                                    borderRadius: '10px', cursor: 'pointer', outline: 'none',
                                                    background: isActive ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
                                                    border: isActive
                                                        ? '1px solid rgba(201,168,76,0.4)'
                                                        : '1px solid rgba(255,255,255,0.06)',
                                                    transition: 'all 200ms ease',
                                                }}
                                            >
                                                <span style={{
                                                    fontFamily: '"DM Sans", sans-serif', fontSize: '14px',
                                                    color: isActive ? '#F0EDE6' : 'rgba(240,237,230,0.5)',
                                                }}>
                                                    {name}
                                                </span>
                                                <MonoChip
                                                    text={isActive ? 'ASSIGNED' : 'NOT ASSIGNED'}
                                                    color={isActive ? 'gold' : 'dim'}
                                                />
                                            </motion.button>
                                        )
                                    })}
                                </div>

                                {/* Exercise plan summary */}
                                <div style={{
                                    marginTop: '16px', padding: '12px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                }}>
                                    <div style={{
                                        fontFamily: '"DM Mono", monospace', fontSize: '10px',
                                        letterSpacing: '0.1em', color: 'rgba(240,237,230,0.3)',
                                        textTransform: 'uppercase', marginBottom: '8px',
                                    }}>
                                        EXERCISE PLAN
                                    </div>
                                    <div style={{
                                        display: 'flex', flexWrap: 'wrap', gap: '6px',
                                    }}>
                                        <MonoChip text={`${exercisePlan.sessions_per_day}x/DAY`} color="blue" />
                                        <MonoChip text={`${exercisePlan.sets} SETS`} color="dim" />
                                        <MonoChip text={`${exercisePlan.reps_per_set} REPS`} color="dim" />
                                        <MonoChip text={`${exercisePlan.hold_secs}S HOLD`} color="gold" />
                                        <MonoChip text={`${exercisePlan.break_between_exercises_secs}S BREAK`} color="dim" />
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Password */}
                        <GlassCard>
                            <div style={{ padding: '24px' }}>
                                <div style={{
                                    fontFamily: '"DM Mono", monospace', fontSize: '10px',
                                    letterSpacing: '0.12em', textTransform: 'uppercase',
                                    color: 'rgba(240,237,230,0.4)', marginBottom: '16px',
                                }}>
                                    SET PATIENT PASSWORD
                                </div>
                                <FormInput
                                    label="Initial Password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Min. 6 characters"
                                />
                                <p style={{
                                    fontFamily: '"DM Sans", sans-serif', fontSize: '11px',
                                    color: 'rgba(240,237,230,0.3)', margin: '10px 0 0',
                                }}>
                                    Share this password with the patient along with their Patient ID.
                                </p>
                            </div>
                        </GlassCard>

                        {/* Error */}
                        {saveError && (
                            <div style={{ display: 'flex' }}>
                                <MonoChip text={saveError} color="red" />
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <PillButton variant="outline" onClick={() => setPhase('upload')}>
                                ← BACK
                            </PillButton>
                            <PillButton variant="gold" onClick={handleSubmit} loading={saving}>
                                REGISTER PATIENT
                            </PillButton>
                        </div>
                    </motion.div>
                )}

                {/* ── SUCCESS PHASE ── */}
                {phase === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <SuccessView
                            patientId={createdPatientId}
                            patientName={fullName}
                            onDone={() => navigate('/doctor/dashboard')}
                        />
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    )
}
