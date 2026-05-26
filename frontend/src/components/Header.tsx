'use client';

import React from 'react';
import { BookOpen, Sparkles, User } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header style={styles.header} className="no-print">
      <div style={styles.container}>
        <Link href="/" style={styles.logo}>
          <div style={styles.logoIcon}>
            <Sparkles size={20} color="#ffffff" />
          </div>
          <span style={styles.logoText}>Veda<span style={styles.logoHighlight}>AI</span></span>
        </Link>
        
        <nav style={styles.nav}>
          <Link href="/" style={styles.navLinkActive}>
            <BookOpen size={16} />
            Assessment Creator
          </Link>
        </nav>

        <div style={styles.userProfile}>
          <div style={styles.avatar}>
            <User size={16} color="#94a3b8" />
          </div>
          <span style={styles.userName}>Dr. Sharma</span>
          <span style={styles.roleTag}>Teacher</span>
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: '70px',
    borderBottom: '1px solid var(--border-glass)',
    background: 'rgba(11, 15, 25, 0.8)',
    backdropFilter: 'blur(12px)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 24px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary), #0284c7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(56, 189, 248, 0.3)',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.02em',
  },
  logoHighlight: {
    color: 'var(--accent-primary)',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  navLinkActive: {
    color: 'var(--accent-primary)',
    fontWeight: 600,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.15)',
    borderRadius: '8px',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border-glass)',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    display: 'none' as const, // Hide on small devices, display in desktop
  },
  roleTag: {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    color: 'var(--accent-secondary)',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
};
