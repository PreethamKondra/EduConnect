"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/global.css';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Apply modern animated background with particles
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = "0";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 4 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.size > 0.2) this.size -= 0.05;
        if (this.x < 0 || this.x > canvas.width) this.speedX = -this.speedX;
        if (this.y < 0 || this.y > canvas.height) this.speedY = -this.speedY;
      }

      draw() {
        if (ctx) {
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const particlesArray: Particle[] = [];
    const numberOfParticles = 120;

    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push(new Particle());
    }

    function animate() {
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
          particlesArray[i].update();
          particlesArray[i].draw();
          for (let j = i; j < particlesArray.length; j++) {
            const dx = particlesArray[i].x - particlesArray[j].x;
            const dy = particlesArray[i].y - particlesArray[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 120) {
              ctx.beginPath();
              ctx.strokeStyle = `rgba(99, 102, 241, ${1 - distance / 120})`;
              ctx.lineWidth = 0.8;
              ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
              ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
              ctx.stroke();
            }
          }
          if (particlesArray[i].size <= 0.2) {
            particlesArray.splice(i, 1);
            particlesArray.push(new Particle());
          }
        }
      }
      requestAnimationFrame(animate);
    }
    animate();

    return () => {
      document.body.removeChild(canvas);
    };
  }, []);

  const handleSignup = async () => {
    if (!name || !email || !password || !phone || !year) {
      setError('All fields are required.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:5000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, year }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Signup failed. Please try again.');
      }

      if (data.success) {
        localStorage.setItem("token", data.token);
        navigate('/home');
      } else {
        setError(data.message || 'Signup failed. Try again.');
      }
    } catch (error) {
      console.error('Signup Error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, nextField?: HTMLInputElement) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextField) {
        nextField.focus();
      } else {
        handleSignup();
      }
    }
  };

  return (
    <div
      className="auth-container"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        fontFamily: "'Manrope', sans-serif",
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
      }}
    >
      <div
        className="auth-card"
        style={{
          width: '100%',
          maxWidth: '900px',
          background: 'rgba(30, 41, 59, 0.85)',
          backdropFilter: 'blur(18px)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)',
          color: '#e2e8f0',
          transition: 'all 0.4s ease',
          border: '1px solid transparent',
          backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.85), rgba(30, 41, 59, 0.85)), linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'row',
          gap: '40px',
          animation: 'fadeInUp 0.7s ease-out',
        }}
      >
        {/* Signup Form Section */}
        <div
          className="signup-form"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div
            className="logo-container"
            style={{
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            <h2
              className="animate-text"
              style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                margin: '0',
                color: '#6366f1',
                textShadow: '0 0 12px rgba(99, 102, 241, 0.5)',
                letterSpacing: '1.2px',
                animation: 'textSlideIn 1s ease-out',
              }}
            >
              Edu-Connect
            </h2>
            <p
              className="animate-text"
              style={{
                fontSize: '0.95rem',
                margin: '10px 0 0',
                color: '#d1d5db',
                fontWeight: '400',
                letterSpacing: '0.5px',
                animation: 'textSlideIn 1.2s ease-out',
              }}
            >
              Join the ultimate student community
            </p>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '20px',
                color: '#ef4444',
                fontSize: '0.9rem',
                textAlign: 'center',
                fontWeight: '500',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                animation: 'shakeError 0.5s ease-in-out',
              }}
            >
              {error}
            </div>
          )}

          <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-container" style={{ position: 'relative' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, document.querySelector('input[type="email"]') as HTMLInputElement)}
                placeholder="Full Name"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  color: '#e2e8f0',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  fontFamily: "'Manrope', sans-serif",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                }}
              />
              <i
                className="fas fa-user"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6366f1',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  zIndex: 2,
                }}
              ></i>
            </div>

            <div className="input-container" style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, document.querySelector('input[type="password"]') as HTMLInputElement)}
                placeholder="Email Address"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  color: '#e2e8f0',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  fontFamily: "'Manrope', sans-serif",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                }}
              />
              <i
                className="fas fa-envelope"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6366f1',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  zIndex: 2,
                }}
              ></i>
            </div>

            <div className="input-container" style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, document.querySelector('input[type="tel"]') as HTMLInputElement)}
                placeholder="Password"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  color: '#e2e8f0',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  fontFamily: "'Manrope', sans-serif",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                }}
              />
              <i
                className="fas fa-lock"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6366f1',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  zIndex: 2,
                }}
              ></i>
            </div>

            <div className="input-container" style={{ position: 'relative' }}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, yearRef.current || undefined)}
                placeholder="Phone Number"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  color: '#e2e8f0',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  fontFamily: "'Manrope', sans-serif",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                }}
              />
              <i
                className="fas fa-phone"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6366f1',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  zIndex: 2,
                }}
              ></i>
            </div>

            <div className="input-container" style={{ position: 'relative' }}>
              <input
                ref={yearRef}
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e)}
                placeholder="Year in College"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  color: '#e2e8f0',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  fontFamily: "'Manrope', sans-serif",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.4)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                }}
              />
              <i
                className="fas fa-graduation-cap"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6366f1',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  zIndex: 2,
                }}
              ></i>
            </div>
          </div>

          <button
            onClick={handleSignup}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              position: 'relative',
              overflow: 'hidden',
              zIndex: 2,
              boxSizing: 'border-box',
              fontFamily: "'Manrope', sans-serif",
              animation: isLoading ? 'buttonPulse 1.5s ease-in-out infinite' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.4)';
            }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span
                  className="spinner"
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.8s linear infinite',
                    marginRight: '8px',
                  }}
                ></span>
                Signing Up...
              </span>
            ) : (
              'Create Account'
            )}
          </button>

          <div
            className="auth-footer"
            style={{
              marginTop: '20px',
              textAlign: 'center',
              fontSize: '0.9rem',
              color: '#d1d5db',
              zIndex: 2,
              fontWeight: '400',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <p>
              Already have an account?{' '}
              <span
                onClick={() => navigate('/')}
                style={{
                  color: '#6366f1',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#4f46e5';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6366f1';
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                Login
              </span>
            </p>
          </div>
        </div>

        {/* Project Info Section */}
        <div
          className="info-section"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '20px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h3
            className="animate-text"
            style={{
              fontSize: '1.8rem',
              fontWeight: '700',
              color: '#6366f1',
              marginBottom: '20px',
              textShadow: '0 0 10px rgba(99, 102, 241, 0.4)',
              animation: 'textSlideIn 1.4s ease-out',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            Welcome to Edu-Connect
          </h3>
          <p
            className="animate-text"
            style={{
              fontSize: '1rem',
              color: '#d1d5db',
              lineHeight: '1.6',
              marginBottom: '20px',
              animation: 'textSlideIn 1.6s ease-out',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            Edu-Connect is your all-in-one platform for university students. Share or donate books, browse e-books and physical copies, and create quizzes to test your knowledge. Connect with peers through chat, join community lounges for discussions, and manage your wishlist and book requests effortlessly.
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: '0',
              fontSize: '0.95rem',
              color: '#d1d5db',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <li
              className="animate-text"
              style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', animation: 'textSlideIn 1.8s ease-out' }}
            >
              <i className="fas fa-book" style={{ marginRight: '10px', color: '#6366f1' }}></i>
              Share & discover books
            </li>
            <li
              className="animate-text"
              style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', animation: 'textSlideIn 2s ease-out' }}
            >
              <i className="fas fa-users" style={{ marginRight: '10px', color: '#6366f1' }}></i>
              Connect with friends
            </li>
            <li
              className="animate-text"
              style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', animation: 'textSlideIn 2.2s ease-out' }}
            >
              <i className="fas fa-question-circle" style={{ marginRight: '10px', color: '#6366f1' }}></i>
               Attempt quizzes
            </li>
          </ul>
        </div>
      </div>

      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes textSlideIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }

          @keyframes shakeError {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }

          @keyframes buttonPulse {
            0% { box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }
            50% { box-shadow: 0 8px 20px rgba(99, 102, 241, 0.6); }
            100% { box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }
          }

          input::placeholder {
            color: rgba(255, 255, 255, 0.45);
            font-size: 0.95rem;
            font-weight: 400;
            font-family: 'Manrope', sans-serif;
          }

          .auth-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35), 0 6px 16px rgba(0, 0, 0, 0.25);
          }

          @media (max-width: 768px) {
            .auth-card {
              flex-direction: column;
              max-width: 380px;
              padding: 30px;
            }

            .info-section {
              border-left: none;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              padding-top: 20px;
            }
          }

          @media (max-width: 480px) {
            .auth-card {
              padding: 24px;
              max-width: 320px;
            }

            h2 {
              font-size: 2rem;
            }

            h3 {
              font-size: 1.5rem;
            }

            button {
              font-size: 0.95rem;
              padding: 12px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Signup;