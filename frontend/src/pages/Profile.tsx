import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/global.css';

const Profile: React.FC = () => {
  const [user, setUser] = useState({ name: '', email: '', phone: '', year: '' });
  const [editedUser, setEditedUser] = useState({ name: '', email: '', phone: '', year: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Particle background effect
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.zIndex = "-1";
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
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
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
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
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
      document.body.appendChild(canvas);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://localhost:5000/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          setUser(data.profile);
          setEditedUser(data.profile);
        } else {
          throw new Error(data.message || 'Profile fetch failed');
        }
      })
      .catch((err) => {
        console.error('Profile Fetch Error:', err);
        setError(err.message);
        if (err.message.includes('401')) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      });
  }, [navigate]);

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    const updateData = { name: editedUser.name, phone: editedUser.phone, year: editedUser.year };
    fetch('http://localhost:5000/profile/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          setUser((prev) => ({ ...prev, ...updateData }));
          setIsEditing(false);
          alert('Profile updated successfully!');
        } else {
          throw new Error(data.message || 'Update failed');
        }
      })
      .catch((err) => {
        console.error('Update Error:', err);
        setError(`Failed to update profile. Details: ${err.message}. Check console for more info.`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleCancel = () => {
    setEditedUser(user);
    setIsEditing(false);
    setError(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100vw',
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '2rem',
      background: 'transparent',
      fontFamily: "'Manrope', sans-serif",
      color: '#e2e8f0',
      position: 'relative',
      overflow: 'hidden',
      zIndex: 1
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem', color: '#6366f1', fontWeight: 'bold' }}>Your Profile</h1>
      <div style={{ 
        background: 'rgba(30, 41, 59, 0.7)',
        padding: '3rem',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        width: '100%',
        maxWidth: '600px',
        textAlign: 'left',
        boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
        border: '1px solid transparent',
        backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.7), rgba(30, 41, 59, 0.7)), linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box'
      }}>
        {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontWeight: 'bold' }}>Error: {error}</p>}
        {isEditing ? (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e2e8f0' }}>Name:</label>
              <input
                type="text"
                name="name"
                value={editedUser.name}
                onChange={handleChange}
                style={{ 
                  width: '100%', 
                  padding: '0.8rem', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(99, 102, 241, 0.3)', 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  color: '#e2e8f0',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e2e8f0' }}>Phone:</label>
              <input
                type="text"
                name="phone"
                value={editedUser.phone}
                onChange={handleChange}
                style={{ 
                  width: '100%', 
                  padding: '0.8rem', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(99, 102, 241, 0.3)', 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  color: '#e2e8f0',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e2e8f0' }}>Year:</label>
              <input
                type="text"
                name="year"
                value={editedUser.year}
                onChange={handleChange}
                style={{ 
                  width: '100%', 
                  padding: '0.8rem', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(99, 102, 241, 0.3)', 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  color: '#e2e8f0',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleUpdate}
                disabled={isLoading}
                style={{ 
                  padding: '0.8rem 2rem',
                  background: 'rgba(46, 204, 113, 0.2)',
                  border: '1px solid rgba(46, 204, 113, 0.5)',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 5px 20px rgba(46, 204, 113, 0.4), inset 0 0 12px rgba(46, 204, 113, 0.6)',
                  opacity: isLoading ? 0.7 : 1,
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 7px 25px rgba(46, 204, 113, 0.6), inset 0 0 15px rgba(46, 204, 113, 0.8)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 5px 20px rgba(46, 204, 113, 0.4), inset 0 0 12px rgba(46, 204, 113, 0.6)';
                  }
                }}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                style={{ 
                  padding: '0.8rem 2rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 5px 20px rgba(239, 68, 68, 0.4), inset 0 0 12px rgba(239, 68, 68, 0.6)',
                  opacity: isLoading ? 0.7 : 1,
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 7px 25px rgba(239, 68, 68, 0.6), inset 0 0 15px rgba(239, 68, 68, 0.8)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 5px 20px rgba(239, 68, 68, 0.4), inset 0 0 12px rgba(239, 68, 68, 0.6)';
                  }
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#e2e8f0' }}>Email: {user.email}</p>
            <p style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#e2e8f0' }}>Name: {user.name}</p>
            <p style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#e2e8f0' }}>Phone: {user.phone}</p>
            <p style={{ fontSize: '1.5rem', marginBottom: '2rem', color: '#e2e8f0' }}>Year: {user.year}</p>
            <button
              onClick={handleEdit}
              style={{ 
                padding: '0.8rem 2rem',
                background: 'rgba(46, 204, 113, 0.2)',
                border: '1px solid rgba(46, 204, 113, 0.5)',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 5px 20px rgba(46, 204, 113, 0.4), inset 0 0 12px rgba(46, 204, 113, 0.6)',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 7px 25px rgba(46, 204, 113, 0.6), inset 0 0 15px rgba(46, 204, 113, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 5px 20px rgba(46, 204, 113, 0.4), inset 0 0 12px rgba(46, 204, 113, 0.6)';
              }}
            >
              Edit Profile
            </button>
          </>
        )}
      </div>
      <button
        onClick={() => navigate('/home')}
        style={{ 
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          padding: '0.8rem 2rem',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          color: '#fff',
          borderRadius: '12px',
          fontSize: '1.1rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 5px 20px rgba(239, 68, 68, 0.4), inset 0 0 12px rgba(239, 68, 68, 0.6)',
          backdropFilter: 'blur(10px)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 7px 25px rgba(239, 68, 68, 0.6), inset 0 0 15px rgba(239, 68, 68, 0.8)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 5px 20px rgba(239, 68, 68, 0.4), inset 0 0 12px rgba(239, 68, 68, 0.6)';
        }}
      >
        Back to Home
      </button>
      <button
        onClick={handleLogout}
        style={{ 
          marginTop: '2rem',
          padding: '0.8rem 2rem',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          color: '#fff',
          borderRadius: '12px',
          fontSize: '1.1rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 5px 20px rgba(239, 68, 68, 0.4), inset 0 0 12px rgba(239, 68, 68, 0.6)',
          backdropFilter: 'blur(10px)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 7px 25px rgba(239, 68, 68, 0.6), inset 0 0 15px rgba(239, 68, 68, 0.8)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 5px 20px rgba(239, 68, 68, 0.4), inset 0 0 12px rgba(239, 68, 68, 0.6)';
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Profile;