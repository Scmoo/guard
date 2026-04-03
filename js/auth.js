import { supabase } from './supabaseClient.js'

function getErrorElement() {
  return document.getElementById('login-error')
}

function clearLoginError() {
  const errorEl = getErrorElement()
  if (!errorEl) return

  errorEl.textContent = ''
  errorEl.style.display = 'none'
}

function showLoginError(message) {
  const errorEl = getErrorElement()
  if (!errorEl) return

  errorEl.textContent = message
  errorEl.style.display = 'block'
}

async function loginWithCredentials(email, password) {
  return await supabase.auth.signInWithPassword({
    email,
    password
  })
}

async function handleSignIn(event) {
  if (event) event.preventDefault()

  clearLoginError()

  const email = document.getElementById('userId')?.value.trim()
  const password = document.getElementById('password')?.value ?? ''

  if (!email || !password) {
    showLoginError('Please enter your email and password.')
    return
  }

  try {
    const { data, error } = await loginWithCredentials(email, password)

    if (error) {
      showLoginError(error.message || 'Invalid login credentials.')
      return
    }

    if (data?.session) {
      window.location.href = '/portal/home/'
      return
    }

    showLoginError('Login failed. Please try again.')
  } catch (err) {
    console.error('Sign-in error:', err)
    showLoginError('Something went wrong while signing in.')
  }
}

async function sendPasswordReset(email) {
  if (!email) {
    showLoginError('Enter your email first to reset your password.')
    return { error: new Error('Missing email') }
  }

  clearLoginError()

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal/login/`
    })

    if (error) {
      showLoginError(error.message || 'Could not send reset email.')
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Password reset error:', err)
    showLoginError('Something went wrong while sending the reset email.')
    return { data: null, error: err }
  }
}

async function checkExistingSession() {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Session check error:', error)
      return
    }

    if (data?.session) {
      window.location.href = '/portal/home/'
    }
  } catch (err) {
    console.error('Unexpected session check error:', err)
  }
}

function initLoginPage() {
  const form = document.getElementById('loginForm')
  if (!form) return

  clearLoginError()
  form.addEventListener('submit', handleSignIn)
  checkExistingSession()
}

// Expose helpers for any existing inline HTML that still calls them
window.initLoginPage = initLoginPage
window.handleSignIn = handleSignIn
window.showLoginError = showLoginError
window.loginWithCredentials = loginWithCredentials
window.sendPasswordReset = sendPasswordReset

initLoginPage()