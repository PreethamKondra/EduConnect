"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../assets/styles/global.css"

const Home: React.FC = () => {
  const [username, setUsername] = useState<string | null>(null)
  const [user, setUser] = useState({ name: "", email: "", phone: "", year: "" })
  const [editedUser, setEditedUser] = useState({ name: "", email: "", phone: "", year: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const navigate = useNavigate()

  // Particle background effect
  useEffect(() => {
    const canvas = document.createElement("canvas")
    canvas.style.position = "fixed"
    canvas.style.top = "0"
    canvas.style.left = "0"
    canvas.style.width = "100vw"
    canvas.style.height = "100vh"
    canvas.style.zIndex = "-1"
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
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`
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
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)"
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
              ctx.strokeStyle = `rgba(99, 102, 241, ${1 - distance / 120})`
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
  }, [])

  // Fetch profile data
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/login")
      return
    }

    fetch("http://localhost:5000/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (data.success) {
          setUsername(data.profile.name)
          setUser(data.profile)
          setEditedUser(data.profile)
        } else {
          throw new Error(data.message || "Profile fetch failed")
        }
      })
      .catch((err) => {
        console.error("Profile Error:", err)
        if (err.message.includes("401")) {
          localStorage.removeItem("token")
          navigate("/login")
        }
      })
  }, [navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditedUser((prev) => ({ ...prev, [name]: value }))
  }

  const handleUpdate = () => {
    setIsLoading(true)
    setError(null)
    const token = localStorage.getItem("token")
    const updateData = { name: editedUser.name, phone: editedUser.phone, year: editedUser.year }
    fetch("http://localhost:5000/profile/update", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.success) {
          setUser((prev) => ({ ...prev, ...updateData }))
          setUsername(updateData.name)
          setEditedUser({ ...editedUser, ...updateData })
          alert("Profile updated successfully!")
        } else {
          throw new Error(data.message || "Update failed")
        }
      })
      .catch((err) => {
        console.error("Update Error:", err)
        setError(`Failed to update profile: ${err.message}`)
      })
      .finally(() => {
        setIsLoading(false)
        setShowPopup(false)
        setShowSidebar(true) // Return to sidebar after update
      })
  }

  const handleCancel = () => {
    setEditedUser(user)
    setError(null)
    setShowPopup(false)
    setShowSidebar(true) // Return to sidebar on cancel
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    navigate("/login")
  }

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  const handleProfileClick = () => {
    setShowSidebar(true)
  }

  if (!localStorage.getItem("token")) {
    return null
  }

  return (
    <div
      className="home-container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        padding: "2rem",
        background: "transparent",
        fontFamily: "'Manrope', sans-serif",
        color: "#e2e8f0",
        position: "relative",
        overflow: "hidden",
        zIndex: 1,
      }}
    >
      {/* Header Section with Logo, Profile and Logout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "3rem",
          zIndex: 10,
          padding: "0.5rem 1rem",
          borderRadius: "16px",
          background: "rgba(30, 41, 59, 0.4)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
        }}
      >
        

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={handleProfileClick}
            style={{
              padding: "0.8rem 2rem",
              background: "rgba(99, 102, 241, 0.2)",
              border: "1px solid rgba(99, 102, 241, 0.5)",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "1.1rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 5px 20px rgba(99, 102, 241, 0.4), inset 0 0 12px rgba(99, 102, 241, 0.6)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px) scale(1.05)"
              e.currentTarget.style.boxShadow =
                "0 7px 25px rgba(99, 102, 241, 0.6), inset 0 0 15px rgba(99, 102, 241, 0.8)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)"
              e.currentTarget.style.boxShadow =
                "0 5px 20px rgba(99, 102, 241, 0.4), inset 0 0 12px rgba(99, 102, 241, 0.6)"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "0.8rem 2rem",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "1.1rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 5px 20px rgba(239, 68, 68, 0.4), inset 0 0 12px rgba(239, 68, 68, 0.6)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px) scale(1.05)"
              e.currentTarget.style.boxShadow =
                "0 7px 25px rgba(239, 68, 68, 0.6), inset 0 0 15px rgba(239, 68, 68, 0.8)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)"
              e.currentTarget.style.boxShadow =
                "0 5px 20px rgba(239, 68, 68, 0.4), inset 0 0 12px rgba(239, 68, 68, 0.6)"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content: Split Layout */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          flex: 1,
          gap: "3rem",
        }}
      >
        {/* Left Side: Floating Card for About EduConnect */}
        <div
          style={{
            flex: 1,
            padding: "3rem",
            color: "#e2e8f0",
            textAlign: "left",
            maxWidth: "50%",
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "20px",
            backdropFilter: "blur(16px)",
            transform: "translateY(-10px)",
            transition: "all 0.4s ease",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3), 0 0 80px rgba(168, 85, 247, 0.2)",
            border: "1px solid transparent",
            backgroundImage:
              "linear-gradient(rgba(30, 41, 59, 0.8), rgba(30, 41, 59, 0.8)), linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.4))",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-15px) scale(1.02)"
            e.currentTarget.style.boxShadow = "0 25px 60px rgba(0,0,0,0.4), 0 0 100px rgba(168, 85, 247, 0.3)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(-10px) scale(1)"
            e.currentTarget.style.boxShadow = "0 20px 50px rgba(0,0,0,0.3), 0 0 80px rgba(168, 85, 247, 0.2)"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "6px",
              background: "linear-gradient(90deg, #4f46e5, #6b21a8, #a855f7)",
              borderRadius: "6px 6px 0 0",
            }}
          ></div>

          <h2
            style={{
              color: "#6366f1",
              fontSize: "3rem",
              marginBottom: "1.5rem",
              fontWeight: "bold",
              textShadow: "0 0 20px rgba(99, 102, 241, 0.5)",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "1px",
            }}
          >
            Welcome, {username || "User"}!
          </h2>

          <h3
            style={{
              color: "#a855f7",
              marginBottom: "2.5rem",
              fontSize: "4rem",
              fontWeight: "bold",
              textShadow: "0 0 15px rgba(168, 85, 247, 0.5)",
              letterSpacing: "1px",
            }}
          >
            EduConnect
          </h3>

          <div
            style={{
              borderLeft: "4px solid #a855f7",
              paddingLeft: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            <p
              style={{
                fontSize: "1.5rem",
                lineHeight: "1.7",
                color: "#f8fafc",
                fontWeight: "500",
                textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
                fontStyle: "italic",
              }}
            >
              "Connecting Students Through Sharing and Learning."
            </p>
          </div>

          <div
            style={{
              padding: "1.5rem",
              background: "rgba(99, 102, 241, 0.1)",
              borderRadius: "12px",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              position: "relative",
            }}
          >
            <p
              style={{
                fontSize: "1.3rem",
                lineHeight: "1.8",
                color: "#e2e8f0",
              }}
            >
              Discover books, connect with peers, join chatrooms, and challenge yourself with quizzes!
            </p>
            <span
              style={{
                position: "absolute",
                bottom: "-10px",
                right: "20px",
                fontSize: "3rem",
                color: "rgba(168, 85, 247, 0.2)",
                transform: "rotate(-10deg)",
              }}
            >
              📚
            </span>
          </div>
        </div>

        {/* Right Side: Interactive Navigation Cards */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "2.5rem",
            maxWidth: "50%",
          }}
        >
          {/* Books Realm Card */}
          <div
            onClick={() => handleNavigation("/books")}
            style={{
              width: "100%",
              maxWidth: "320px",
              height: "120px",
              background: "rgba(79, 70, 229, 0.2)",
              border: "1px solid rgba(79, 70, 229, 0.5)",
              color: "#fff",
              borderRadius: "16px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 10px 30px rgba(79, 70, 229, 0.4), inset 0 0 20px rgba(79, 70, 229, 0.6)",
              backdropFilter: "blur(10px)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              padding: "0 1.5rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05) translateY(-8px)"
              e.currentTarget.style.boxShadow =
                "0 15px 40px rgba(79, 70, 229, 0.6), inset 0 0 25px rgba(79, 70, 229, 0.8)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1) translateY(0)"
              e.currentTarget.style.boxShadow =
                "0 10px 30px rgba(79, 70, 229, 0.4), inset 0 0 20px rgba(79, 70, 229, 0.6)"
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "12px",
                background: "rgba(79, 70, 229, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "1.5rem",
                fontSize: "2rem",
              }}
            >
              📚
            </div>
            <div>
              <h3
                style={{
                  margin: "0",
                  fontSize: "1.6rem",
                  fontWeight: "bold",
                  lineHeight: "1.2",
                }}
              >
                Books Realm
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "0.9rem",
                  opacity: "0.8",
                }}
              >
                Explore and share books
              </p>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                background: "rgba(79, 70, 229, 0.3)",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            ></div>
          </div>

          {/* Connect Hub Card */}
          <div
            onClick={() => handleNavigation("/chat")}
            style={{
              width: "100%",
              maxWidth: "320px",
              height: "120px",
              background: "rgba(168, 85, 247, 0.2)",
              border: "1px solid rgba(168, 85, 247, 0.5)",
              color: "#fff",
              borderRadius: "16px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 10px 30px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.6)",
              backdropFilter: "blur(10px)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              padding: "0 1.5rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05) translateY(-8px)"
              e.currentTarget.style.boxShadow =
                "0 15px 40px rgba(168, 85, 247, 0.6), inset 0 0 25px rgba(168, 85, 247, 0.8)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1) translateY(0)"
              e.currentTarget.style.boxShadow =
                "0 10px 30px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.6)"
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "12px",
                background: "rgba(168, 85, 247, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "1.5rem",
                fontSize: "2rem",
              }}
            >
              💬
            </div>
            <div>
              <h3
                style={{
                  margin: "0",
                  fontSize: "1.6rem",
                  fontWeight: "bold",
                  lineHeight: "1.2",
                }}
              >
                Connect Hub
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "0.9rem",
                  opacity: "0.8",
                }}
              >
                Chat with peers
              </p>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                background: "rgba(168, 85, 247, 0.3)",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            ></div>
          </div>

          {/* Community Lounge Card */}
          <div
            onClick={() => handleNavigation("/chatrooms")}
            style={{
              width: "100%",
              maxWidth: "320px",
              height: "120px",
              background: "rgba(236, 72, 153, 0.2)",
              border: "1px solid rgba(236, 72, 153, 0.5)",
              color: "#fff",
              borderRadius: "16px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 10px 30px rgba(236, 72, 153, 0.4), inset 0 0 20px rgba(236, 72, 153, 0.6)",
              backdropFilter: "blur(10px)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              padding: "0 1.5rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05) translateY(-8px)"
              e.currentTarget.style.boxShadow =
                "0 15px 40px rgba(236, 72, 153, 0.6), inset 0 0 25px rgba(236, 72, 153, 0.8)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1) translateY(0)"
              e.currentTarget.style.boxShadow =
                "0 10px 30px rgba(236, 72, 153, 0.4), inset 0 0 20px rgba(236, 72, 153, 0.6)"
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "12px",
                background: "rgba(236, 72, 153, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "1.5rem",
                fontSize: "2rem",
              }}
            >
              👥
            </div>
            <div>
              <h3
                style={{
                  margin: "0",
                  fontSize: "1.6rem",
                  fontWeight: "bold",
                  lineHeight: "1.2",
                }}
              >
                Community
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "0.9rem",
                  opacity: "0.8",
                }}
              >
                Join group discussions
              </p>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                background: "rgba(236, 72, 153, 0.3)",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            ></div>
          </div>

          {/* Quiz Arena Card */}
          <div
            onClick={() => handleNavigation("/quiz")}
            style={{
              width: "100%",
              maxWidth: "320px",
              height: "120px",
              background: "rgba(14, 165, 233, 0.2)",
              border: "1px solid rgba(14, 165, 233, 0.5)",
              color: "#fff",
              borderRadius: "16px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 10px 30px rgba(14, 165, 233, 0.4), inset 0 0 20px rgba(14, 165, 233, 0.6)",
              backdropFilter: "blur(10px)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              padding: "0 1.5rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05) translateY(-8px)"
              e.currentTarget.style.boxShadow =
                "0 15px 40px rgba(14, 165, 233, 0.6), inset 0 0 25px rgba(14, 165, 233, 0.8)"
            }}
            // onMouseLeave={(e) => {
            //   e.currentTarget.style.transform = "scale(1) translateY(0)"
            // }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1) translateY(0)"
              e.currentTarget.style.boxShadow =
                "0 10px 30px rgba(14, 165, 233, 0.4), inset 0 0 20px rgba(14, 165, 233, 0.6)"
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "12px",
                background: "rgba(14, 165, 233, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "1.5rem",
                fontSize: "2rem",
              }}
            >
              🧠
            </div>
            <div>
              <h3
                style={{
                  margin: "0",
                  fontSize: "1.6rem",
                  fontWeight: "bold",
                  lineHeight: "1.2",
                }}
              >
                Quiz 
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  fontSize: "0.9rem",
                  opacity: "0.8",
                }}
              >
                Test your knowledge
              </p>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "-20px",
                right: "-20px",
                width: "80px",
                height: "80px",
                background: "rgba(14, 165, 233, 0.3)",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Sidebar for Profile */}
      {showSidebar && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "25%",
            height: "100vh",
            background: "rgba(30, 41, 59, 0.95)",
            backdropFilter: "blur(16px)",
            boxShadow: "-5px 0 25px rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
            transform: showSidebar ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.3s ease-in-out",
            padding: "2rem",
            color: "#e2e8f0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
              borderBottom: "1px solid rgba(99, 102, 241, 0.3)",
              paddingBottom: "1rem",
            }}
          >
            <h3
              style={{
                fontSize: "1.8rem",
                margin: 0,
                color: "#6366f1",
                fontWeight: "bold",
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Your Profile
            </h3>
            <button
              onClick={() => setShowSidebar(false)}
              style={{
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.5)",
                color: "#fff",
                borderRadius: "50%",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.4)"
                e.currentTarget.style.transform = "scale(1.1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"
                e.currentTarget.style.transform = "scale(1)"
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              flex: 1,
            }}
          >
            <div
              style={{
                background: "rgba(99, 102, 241, 0.1)",
                padding: "1.5rem",
                borderRadius: "12px",
                border: "1px solid rgba(99, 102, 241, 0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.8rem",
                  }}
                >
                  {username ? username.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h4
                    style={{
                      margin: "0 0 0.3rem",
                      fontSize: "1.4rem",
                      fontWeight: "bold",
                    }}
                  >
                    {username || "User"}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      opacity: 0.8,
                    }}
                  >
                    {user.email}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      color: "#90e0ef",
                    }}
                  >
                    Name
                  </label>
                  <p
                    style={{
                      margin: 0,
                      padding: "0.7rem 1rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {user.name}
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      color: "#90e0ef",
                    }}
                  >
                    Phone
                  </label>
                  <p
                    style={{
                      margin: 0,
                      padding: "0.7rem 1rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {user.phone || "Not provided"}
                  </p>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      color: "#90e0ef",
                    }}
                  >
                    Year
                  </label>
                  <p
                    style={{
                      margin: 0,
                      padding: "0.7rem 1rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {user.year || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowPopup(true)}
            style={{
              padding: "0.9rem 1.5rem",
              background: "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "1.1rem",
              fontWeight: "600",
              cursor: "pointer",
              marginTop: "1.5rem",
              transition: "all 0.3s ease",
              boxShadow: "0 5px 15px rgba(79, 70, 229, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)"
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(79, 70, 229, 0.6)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "0 5px 15px rgba(79, 70, 229, 0.4)"
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Update Profile
          </button>
        </div>
      )}

      {/* Popup for Updating Profile */}
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1001,
          }}
          onClick={() => setShowPopup(false)}
        >
          <div
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              padding: "2.5rem",
              borderRadius: "20px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.3)",
              width: "90%",
              maxWidth: "450px",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              color: "#e2e8f0",
              border: "1px solid transparent",
              backgroundImage:
                "linear-gradient(rgba(30, 41, 59, 0.95), rgba(30, 41, 59, 0.95)), linear-gradient(135deg, rgba(79, 70, 229, 0.4), rgba(168, 85, 247, 0.4))",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "6px",
                background: "linear-gradient(90deg, #4f46e5, #6b21a8, #a855f7)",
                borderRadius: "6px 6px 0 0",
              }}
            ></div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  fontSize: "1.8rem",
                  margin: 0,
                  color: "#6366f1",
                  fontWeight: "bold",
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Update Profile
              </h3>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  color: "#fff",
                  borderRadius: "50%",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.4)"
                  e.currentTarget.style.transform = "scale(1.1)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"
                  e.currentTarget.style.transform = "scale(1)"
                }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: "1rem",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                    fontSize: "1rem",
                    color: "#90e0ef",
                  }}
                >
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={editedUser.name}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.9rem 1.2rem",
                    border: "1px solid rgba(99, 102, 241, 0.5)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e2e8f0",
                    fontSize: "1rem",
                    transition: "all 0.3s ease",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(99, 102, 241, 0.3)"
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.7)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none"
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)"
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                    fontSize: "1rem",
                    color: "#90e0ef",
                  }}
                >
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={editedUser.phone}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.9rem 1.2rem",
                    border: "1px solid rgba(99, 102, 241, 0.5)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e2e8f0",
                    fontSize: "1rem",
                    transition: "all 0.3s ease",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(99, 102, 241, 0.3)"
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.7)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none"
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)"
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                    fontSize: "1rem",
                    color: "#90e0ef",
                  }}
                >
                  Year
                </label>
                <input
                  type="text"
                  name="year"
                  value={editedUser.year}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.9rem 1.2rem",
                    border: "1px solid rgba(99, 102, 241, 0.5)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e2e8f0",
                    fontSize: "1rem",
                    transition: "all 0.3s ease",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(99, 102, 241, 0.3)"
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.7)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none"
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)"
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
                marginTop: "1rem",
              }}
            >
              <button
                onClick={handleCancel}
                style={{
                  padding: "0.9rem 1.5rem",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  color: "#fff",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isLoading}
                style={{
                  padding: "0.9rem 1.5rem",
                  background: "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.7 : 1,
                  transition: "all 0.3s ease",
                  boxShadow: "0 5px 15px rgba(79, 70, 229, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = "translateY(-3px)"
                    e.currentTarget.style.boxShadow = "0 8px 25px rgba(79, 70, 229, 0.6)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "0 5px 15px rgba(79, 70, 229, 0.4)"
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                        borderRadius: "50%",
                        borderTopColor: "#fff",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                    <style>{`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                    `}</style>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
