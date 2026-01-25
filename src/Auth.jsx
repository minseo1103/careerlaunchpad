
import React, { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    // Helper to create a dummy email from username
    const getEmail = (uid) => `${uid}@example.com`

    const validate = () => {
        if (password.length < 6) {
            setErrorMsg('Password must be at least 6 characters')
            return false
        }
        if (username.length < 3) {
            setErrorMsg('Username must be at least 3 characters')
            return false
        }
        return true
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        setErrorMsg('')
        if (!validate()) return

        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email: getEmail(username),
            password,
        })
        if (error) alert(error.message)
        setLoading(false)
    }

    const handleSignUp = async (e) => {
        e.preventDefault()
        setLoading(true)
        const { error } = await supabase.auth.signUp({
            email: getEmail(username),
            password,
        })
        if (error) {
            alert(error.message)
        } else {
            alert('Account created! You can now log in.')
        }
        setLoading(false)
    }

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Sign in to access your dashboard</p>

                {errorMsg && <div className="auth-error">{errorMsg}</div>}

                <form onSubmit={handleLogin} className="auth-form">
                    <input
                        className="auth-input"
                        type="text"
                        placeholder="Username"
                        value={username}
                        required={true}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        className="auth-input"
                        type="password"
                        placeholder="Password"
                        value={password}
                        required={true}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button className="auth-button" disabled={loading}>
                        {loading ? <span>Loading...</span> : <span>Log In</span>}
                    </button>
                </form>

                <div className="auth-divider">
                    <p className="auth-signup-text">Don't have an account?</p>
                    <button className="auth-signup-btn" onClick={handleSignUp} disabled={loading}>
                        Sign Up
                    </button>
                </div>
            </div>
        </div>
    )
}

