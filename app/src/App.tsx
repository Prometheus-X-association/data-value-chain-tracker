import React, { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';

import './App.css';
import { DataNodes } from './DataNodes/DataNodes';

type AuthProfile = {
  username: string;
  organizationId: string;
  displayName: string;
};

function App() {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await axios.get<AuthProfile>('/api/auth/me', {
          withCredentials: true,
        });
        setProfile(response.data);
      } catch (error) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      const response = await axios.post<AuthProfile>(
        '/api/auth/login',
        {
          username: username.trim(),
          password,
        },
        {
          withCredentials: true,
        },
      );

      setProfile(response.data);
      setUsername('');
      setPassword('');
    } catch (error) {
      setAuthError('Sign-in failed. Check your organization credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      await axios.post(
        '/api/auth/logout',
        {},
        {
          withCredentials: true,
        },
      );
    } catch (error) {
      // Clear local auth state even when the session has already expired.
    } finally {
      setProfile(null);
      setPassword('');
      setAuthError(null);
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="app-shell">
        <main className="app-shell__content app-shell__content--centered">
          <section className="auth-card">
            <p className="app-shell__eyebrow">Secure Workspace</p>
            <h1>Checking your organization access</h1>
            <p className="app-shell__summary">
              We are verifying whether a saved organization session is available.
            </p>
          </section>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app-shell">
        <main className="app-shell__content auth-layout">
          <section className="auth-hero">
            <p className="app-shell__eyebrow">Data Value Chain Tracker</p>
            <div className="app-shell__headline">
              <h1>Organization access for traceability and incentive oversight</h1>
              <p className="app-shell__summary">
                Open your DVCT workspace to inspect connected hierarchies,
                follow participation paths, and review scoped graph activity.
              </p>
            </div>
          </section>

          <div className="auth-layout__lower">
            <div className="auth-hero__highlights">
              <article>
                <span>Scoped graph</span>
                <strong>Organization-specific visibility</strong>
              </article>
              <article>
                <span>Traceability</span>
                <strong>Connected node hierarchies</strong>
              </article>
              <article>
                <span>Review</span>
                <strong>Node details and subtree focus</strong>
              </article>
            </div>

            <section className="auth-card auth-card--login">
              <p className="app-shell__eyebrow">Organization Login</p>
              <h2>Sign in</h2>
              <p className="auth-card__text">
                Use your organization credentials to continue.
              </p>

              <form className="auth-form" onSubmit={handleSignIn}>
                <label className="auth-form__field">
                  <span>Username</span>
                  <input
                    autoComplete="username"
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="org3335"
                    required
                    value={username}
                  />
                </label>

                <label className="auth-form__field">
                  <span>Password</span>
                  <input
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    required
                    type="password"
                    value={password}
                  />
                </label>

                {authError ? <p className="auth-form__error">{authError}</p> : null}

                <button className="auth-form__submit" disabled={loading} type="submit">
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-bar">
          <p className="app-shell__eyebrow">Data Value Chain Tracker</p>
          <div className="app-shell__session">
            <span>{profile.displayName}</span>
            <button onClick={() => void handleSignOut()} type="button">Sign out</button>
          </div>
        </div>
        <div className="app-shell__headline">
          <h1>Explore node relationships and incentive flow</h1>
          <p className="app-shell__summary">
            Inspect the full data network, focus on a specific subtree, and review
            node metadata.
          </p>
        </div>
      </header>

      <main className="app-shell__content">
        <DataNodes organizationId={profile.organizationId} />
      </main>
    </div>
  );
}

export default App;
