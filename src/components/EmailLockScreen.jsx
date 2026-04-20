import React, { useState } from 'react';
import { RainbowButton } from '../components/ui/rainbow-button';
import FlickeringBackground from './FlickeringBackground';
import { GlowingEffect } from './ui/glowing-effect';

const BLOCKED_DOMAINS = ["commure.com", "hippocraticai.com"];

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.com.br", "yahoo.co.in",
  "hotmail.com", "hotmail.co.uk",
  "outlook.com", "outlook.com.br",
  "live.com", "live.co.uk",
  "msn.com",
  "aol.com",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me",
  "zoho.com",
  "yandex.com", "yandex.ru",
  "mail.com", "email.com",
  "gmx.com", "gmx.net",
  "fastmail.com",
  "tutanota.com", "tuta.io",
  "hey.com",
  "inbox.com",
  "rediffmail.com",
  "uol.com.br", "bol.com.br", "terra.com.br",
];

const EmailLockScreen = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    const domain = email.trim().toLowerCase().split("@")[1];
    if (BLOCKED_DOMAINS.includes(domain)) {
      setError('Access denied. Please contact sales@keyreply.com for more information.');
      return;
    }
    if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
      setError('Please use your work email address to access this demo.');
      return;
    }
    onSubmit(email);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <FlickeringBackground />
      <div className="relative bg-gray-900 bg-opacity-60 p-8 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl backdrop-blur-sm">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <div className="mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">Voice AI Demo</h2>
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <a
              href="https://keyreply.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              KeyReply
            </a>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="Please enter your email address"
              className="w-full p-4 rounded-lg bg-gray-800 text-white border border-gray-600 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 placeholder:text-gray-400"
            />
            {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
          </div>
          <RainbowButton 
            type="submit" 
            className="w-full justify-center text-white text-lg font-semibold transition-all duration-200"
          >
            Start Demo
          </RainbowButton>
        </form>
      </div>
    </div>
  );
};

export default EmailLockScreen;
