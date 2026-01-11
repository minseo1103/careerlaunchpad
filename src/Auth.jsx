import React, { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) alert(error.message)
        setLoading(false)
    }

    const handleSignUp = async (e) => {
        e.preventDefault()
        setLoading(true)
        const { error } = await supabase.auth.signUp({
            email,
            password,
        })
        if (error) {
            alert(error.message)
        } else {
            alert('Check your email for the login link!')
        }
        setLoading(false)
    }

    return (
        <div className="auth-container" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'var(--bg-primary)' // Matches index.css theme
        }}>
            <div className="auth-box" style={{
                padding: '2rem',
                borderRadius: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <h1 style={{ marginBottom: '1.5rem', fontSize: '1.8rem' }}>Welcome Back</h1>
                <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>Sign in to access your dashboard</p>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        className="input"
                        type="email"
                        placeholder="Your email"
                        value={email}
                        required={true}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            fontSize: '1rem'
                        }}
                    />
                    <input
                        className="input"
                        type="password"
                        placeholder="Your password"
                        value={password}
                        required={true}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            fontSize: '1rem'
                        }}
                    />
                    <button className="button block" disabled={loading} style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        marginTop: '0.5rem'
                    }}>
                        {loading ? <span>Loading</span> : <span>Log In</span>}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Don't have an account?</p>
                    <button onClick={handleSignUp} disabled={loading} style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}>
                        Sign Up
                    </button>
                </div>
            </div>
        </div>
    )
}
