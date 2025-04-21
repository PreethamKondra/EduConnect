import React, { useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import '../../assets/styles/global.css';

const BooksRealm: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particlesArray: { x: number; y: number; dx: number; dy: number; size: number; color: string }[] = [];
    const numberOfParticles = 120;

    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        size: Math.random() * 5 + 1,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      });
    }

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particlesArray.length; i++) {
        const p = particlesArray[i];
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = i; j < particlesArray.length; j++) {
          const p2 = particlesArray[j];
          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / 100})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.removeChild(canvas);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem',
        background: 'transparent',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#e2e8f0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => navigate('/home')}
        style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          padding: '0.8rem 2.2rem',
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '20px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 5px 15px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 10,
          backdropFilter: 'blur(5px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 5px 15px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.2)';
        }}
      >
        <span style={{ fontSize: '1.3rem', marginRight: '0.3rem' }}>←</span> Back to Home
      </button>

      <h1 style={{ 
        fontSize: '4rem', 
        marginBottom: '2rem', 
        color: '#a855f7', 
        textAlign: 'center',
        textShadow: '0 0 20px rgba(168, 85, 247, 0.7), 0 0 40px rgba(168, 85, 247, 0.4)',
        fontWeight: 'bold',
        letterSpacing: '2px',
        position: 'relative',
        display: 'inline-block'
      }}>
        <span style={{
          position: 'relative',
          zIndex: 2,
          background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Books Realm</span>
        <span style={{
          position: 'absolute',
          top: '5px',
          left: '5px',
          right: 0,
          zIndex: 1,
          color: 'rgba(99, 102, 241, 0.4)',
          filter: 'blur(8px)'
        }}>Books Realm</span>
      </h1>

      <nav
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          maxWidth: '900px',
          margin: '0 auto 2.5rem',
        }}
      >
        {[
          { path: 'browse', label: 'Browse Books', icon: '🔍' },
          { path: 'contribute', label: 'Contribute Books', icon: '📤' },
          { path: 'requests', label: 'Book Requests', icon: '📝' },
          { path: 'my-requests', label: 'My Requests', icon: '📋' },
          { path: 'wishlist', label: 'Wishlist', icon: '❤️' },
        ].map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              padding: '0.9rem 1.8rem',
              background: isActive
                ? 'linear-gradient(135deg, #4f46e5, #6b21a8)'
                : 'rgba(255, 255, 255, 0.08)',
              color: '#e2e8f0',
              border: isActive ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              fontSize: '1.1rem',
              fontWeight: isActive ? 'bold' : 'normal',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxShadow: isActive ? '0 5px 15px rgba(79, 70, 229, 0.4), inset 0 0 10px rgba(168, 85, 247, 0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.7rem',
              backdropFilter: 'blur(8px)',
            })}
            onMouseEnter={(e) => {
              const target = e.currentTarget;
              if (!target.classList.contains('active')) {
                target.style.transform = 'translateY(-5px) scale(1.05)';
                target.style.boxShadow = '0 8px 20px rgba(168, 85, 247, 0.3)';
                target.style.border = '1px solid rgba(168, 85, 247, 0.3)';
                target.style.background = 'rgba(255, 255, 255, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget;
              if (!target.classList.contains('active')) {
                target.style.transform = 'translateY(0) scale(1)';
                target.style.boxShadow = 'none';
                target.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                target.style.background = 'rgba(255, 255, 255, 0.08)';
              }
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>{icon}</span> {label}
          </NavLink>
        ))}
      </nav>

      <div
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          padding: '2.5rem',
          borderRadius: '24px',
          backdropFilter: 'blur(16px)',
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto',
          flex: 1,
          boxShadow: '0 15px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(168, 85, 247, 0.3)',
          border: '1px solid transparent',
          backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.7), rgba(30, 41, 59, 0.7)), linear-gradient(135deg, rgba(79, 70, 229, 0.4), rgba(168, 85, 247, 0.4))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #4f46e5, #6b21a8, #a855f7)',
          borderRadius: '6px 6px 0 0',
        }}></div>
        <Outlet />
      </div>
    </div>
  );
};

export default BooksRealm;
