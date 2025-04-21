"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../assets/styles/global.css"

const Login: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if already logged in
    if (localStorage.getItem("token")) {
      navigate("/home")
    }
    // Apply modern animated background with particles
    const canvas = document.createElement("canvas")
    canvas.style.position = "absolute"
    canvas.style.top = "0"
    canvas.style.left = "0"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.zIndex = "0"
    document.body.appendChild(canvas)
    const ctx = canvas.getContext("2d")
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string

      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 4 + 1
        this.speedX = Math.random() * 2 - 1
        this.speedY = Math.random() * 2 - 1
        this.color = `hsl(${Math.random() * 360}, 80%, 60%)`
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        if (this.size > 0.2) this.size -= 0.05
        if (this.x < 0 || this.x > canvas.width) this.speedX = -this.speedX
        if (this.y < 0 || this.y > canvas.height) this.speedY = -this.speedY
      }

      draw() {
        if (ctx) {
          ctx.fillStyle = this.color
          ctx.beginPath()
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const particlesArray: Particle[] = []
    const numberOfParticles = 120

    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push(new Particle())
    }

    function animate() {
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = "rgba(15, 23, 42, 0.95)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < particlesArray.length; i++) {
          particlesArray[i].update()
          particlesArray[i].draw()
          for (let j = i; j < particlesArray.length; j++) {
            const dx = particlesArray[i].x - particlesArray[j].x
            const dy = particlesArray[i].y - particlesArray[j].y
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance < 120) {
              ctx.beginPath()
              ctx.strokeStyle = `rgba(59, 130, 246, ${1 - distance / 120})`
              ctx.lineWidth = 0.8
              ctx.moveTo(particlesArray[i].x, particlesArray[i].y)
              ctx.lineTo(particlesArray[j].x, particlesArray[j].y)
              ctx.stroke()
            }
          }
          if (particlesArray[i].size <= 0.2) {
            particlesArray.splice(i, 1)
            particlesArray.push(new Particle())
          }
        }
      }
      requestAnimationFrame(animate)
    }
    animate()

    return () => {
      document.body.removeChild(canvas)
    }
  }, [navigate])

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required.")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Login failed. Please check your credentials.")
      }

      localStorage.setItem("token", data.token)
      navigate("/home")
    } catch (error) {
      console.error("Login Error:", error)
      setError(error instanceof Error ? error.message : "Connection issue. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, nextField?: HTMLInputElement) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (nextField) {
        nextField.focus()
      } else {
        handleLogin()
      }
    }
  }

  return (
    <div
      className="auth-container"
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        fontFamily: "'Manrope', sans-serif",
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
      }}
    >
      <div
        className="auth-card"
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "rgba(30, 41, 59, 0.85)",
          backdropFilter: "blur(18px)",
          borderRadius: "24px",
          padding: "48px",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)",
          color: "#e2e8f0",
          transition: "all 0.4s ease",
          border: "1px solid transparent",
          backgroundImage: "linear-gradient(rgba(30, 41, 59, 0.85), rgba(30, 41, 59, 0.85)), linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          animation: "float 4s ease-in-out infinite",
        }}
      >
        <div
          className="logo-container"
          style={{
            marginBottom: "28px",
          }}
        >
          <h2
            style={{
              fontSize: "2.7rem",
              fontWeight: "800",
              margin: "0",
              color: "#6366f1",
              textShadow: "0 0 12px rgba(99, 102, 241, 0.5)",
              letterSpacing: "1.2px",
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            Edu-Connect
          </h2>
          <p
            style={{
              fontSize: "0.95rem",
              margin: "10px 0 0",
              color: "#d1d5db",
              fontWeight: "400",
              letterSpacing: "0.5px",
            }}
          >
            Connect, Share, learn, and grow together
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              borderRadius: "10px",
              padding: "14px",
              marginBottom: "24px",
              color: "#ef4444",
              fontSize: "0.9rem",
              textAlign: "center",
              fontWeight: "500",
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.25)",
            }}
          >
            {error}
          </div>
        )}

        <div
          className="input-group"
          style={{
            marginBottom: "28px",
            zIndex: 2,
          }}
        >
          <div
            className="input-container"
            style={{
              position: "relative",
              marginBottom: "20px",
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, document.querySelector('input[type="password"]') as HTMLInputElement)}
              placeholder="Email Address"
              style={{
                width: "100%",
                padding: "14px 14px 14px 44px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "10px",
                fontSize: "0.95rem",
                color: "#e2e8f0",
                transition: "all 0.3s ease",
                outline: "none",
                boxSizing: "border-box",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                fontFamily: "'Manrope', sans-serif",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#6366f1"
                e.target.style.boxShadow = "0 0 10px rgba(99, 102, 241, 0.4)"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.15)"
                e.target.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.1)"
              }}
            />
            <i
              className="fas fa-envelope"
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6366f1",
                fontSize: "1rem",
                transition: "all 0.3s ease",
                zIndex: 2,
              }}
            ></i>
          </div>

          <div
            className="input-container"
            style={{
              position: "relative",
              marginBottom: "20px",
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e)}
              placeholder="Password"
              style={{
                width: "100%",
                padding: "14px 14px 14px 44px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "10px",
                fontSize: "0.95rem",
                color: "#e2e8f0",
                transition: "all 0.3s ease",
                outline: "none",
                boxSizing: "border-box",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                fontFamily: "'Manrope', sans-serif",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#6366f1"
                e.target.style.boxShadow = "0 0 10px rgba(99, 102, 241, 0.4)"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.15)"
                e.target.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.1)"
              }}
            />
            <i
              className="fas fa-lock"
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6366f1",
                fontSize: "1rem",
                transition: "all 0.3s ease",
                zIndex: 2,
              }}
            ></i>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "14px",
            background: "linear-gradient(90deg, #6366f1, #4f46e5)",
            border: "none",
            borderRadius: "10px",
            color: "#ffffff",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
            position: "relative",
            overflow: "hidden",
            zIndex: 2,
            boxSizing: "border-box",
            fontFamily: "'Manrope', sans-serif",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = "translateY(-3px)"
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(99, 102, 241, 0.5)"
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(99, 102, 241, 0.4)"
          }}
        >
          {isLoading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span
                className="spinner"
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  borderTopColor: "#fff",
                  animation: "spin 0.8s linear infinite",
                  marginRight: "8px",
                }}
              ></span>
              Logging in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>

        <div
          className="auth-footer"
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "0.9rem",
            color: "#d1d5db",
            zIndex: 2,
            fontWeight: "400",
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          <p>
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/signup")}
              style={{
                color: "#6366f1",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#4f46e5"
                e.currentTarget.style.textDecoration = "underline"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#6366f1"
                e.currentTarget.style.textDecoration = "none"
              }}
            >
              Sign Up
            </span>
          </p>
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
          
          input::placeholder {
            color: rgba(255, 255, 255, 0.45);
            font-size: 0.95rem;
            font-weight: 400;
            font-family: 'Manrope', sans-serif;
          }
          
          .auth-card {
            animation: fadeInUp 0.7s ease-out;
          }
          
          .input-container {
            animation: fadeInUp 0.9s ease-out;
          }
          
          .auth-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35), 0 6px 16px rgba(0, 0, 0, 0.25);
          }
          
          @media (max-width: 768px) {
            .auth-card {
              padding: 36px 24px;
              max-width: 380px;
            }
          }
          
          @media (max-width: 480px) {
            .auth-card {
              padding: 28px 18px;
              max-width: 320px;
            }
            
            h2 {
              font-size: 2.2rem;
            }
            
            button {
              font-size: 0.95rem;
              padding: 12px;
            }
          }
        `}
      </style>
    </div>
  )
}

export default Login