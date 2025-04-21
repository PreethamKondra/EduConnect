"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../../assets/styles/global.css"

interface Request {
  _id: string
  title: string
  author?: string
  type: "Physical Book" | "E-Book" | "Physical/E-Book"
  image?: string | null
}

const MyRequests: React.FC = () => {
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [type, setType] = useState<"Physical Book" | "E-Book" | "Physical/E-Book">("Physical/E-Book")
  const [file, setFile] = useState<File | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const navigate = useNavigate()
  const token = localStorage.getItem("token")

  useEffect(() => {
    if (!token) {
      navigate("/login")
      return
    }
    fetchRequests()
  }, [navigate, token])

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("http://localhost:5000/request/mine", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setRequests(
          data.requests.map((req: any) => ({
            ...req,
            image: req.image || null,
          })),
        )
        if (data.requests.length === 0) {
          setError("No requests found for this user.")
        } else {
          setError(null)
        }
      } else {
        let errorMessage = data.message || "Failed to fetch requests"
        if (response.status === 401) {
          errorMessage = "Session expired. Please log in again."
          localStorage.removeItem("token")
          navigate("/login")
        }
        setError(errorMessage)
        setRequests([])
      }
    } catch (err) {
      setError("Network error: Ensure backend is running at http://localhost:5000.")
      setRequests([])
      console.error("❌ MyRequests: Fetch requests error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequest = async () => {
    if (!title) {
      setError("Title is required")
      return
    }
    const formData = new FormData()
    formData.append("title", title)
    if (author) formData.append("author", author)
    formData.append("type", type)
    if (file) formData.append("image", file)

    try {
      setIsLoading(true)
      const response = await fetch("http://localhost:5000/request/add", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setRequests([...requests, { ...data.request, image: data.request.image || null }])
        setTitle("")
        setAuthor("")
        setType("Physical/E-Book")
        setFile(null)
        setError(null)
        alert("Request posted successfully!")
      } else {
        let errorMessage = data.message || "Failed to post request"
        if (response.status === 404) {
          errorMessage = "Backend route not found. Please ensure the server is configured correctly."
        } else if (response.status === 401) {
          errorMessage = "Session expired. Please log in again."
          localStorage.removeItem("token")
          navigate("/login")
        }
        setError(errorMessage)
      }
    } catch (err) {
      setError("Network error: Ensure backend is running at http://localhost:5000.")
      console.error("❌ MyRequests: Request error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRequest = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:5000/request/delete/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setRequests(requests.filter((req) => req._id !== id))
        alert("Request deleted successfully")
        setError(null)
        fetchRequests()
      } else {
        let errorMessage = data.message || "Failed to delete request"
        if (response.status === 401) {
          errorMessage = "Session expired. Please log in again."
          localStorage.removeItem("token")
          navigate("/login")
        }
        setError(errorMessage)
      }
    } catch (err) {
      setError("Network error: Ensure backend is running.")
      console.error("❌ MyRequests: Delete error:", err)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    })
  }

  return (
    <div style={{ background: "transparent", position: "relative" }}>
      {error && (
        <div
          style={{
            color: "#ff8787",
            marginBottom: "1.5rem",
            fontWeight: "bold",
            background: "rgba(239, 68, 68, 0.1)",
            padding: "1rem",
            borderRadius: "10px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>⚠️</span> Error: {error}
        </div>
      )}
      {isLoading && (
        <div
          style={{
            textAlign: "center",
            color: "#a855f7",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid rgba(168, 85, 247, 0.3)",
              borderRadius: "50%",
              borderTopColor: "#a855f7",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <style>{`
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `}</style>
          Loading...
        </div>
      )}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem"
      }}>
        <h2
          style={{
            color: "#a855f7",
            fontSize: "2rem",
            fontWeight: "bold",
            textShadow: "0 0 10px rgba(168, 85, 247, 0.3)",
          }}
        >
          My Requests
        </h2>
        <button
          onClick={() => setShowPopup(true)}
          style={{
            padding: "0.8rem 1.5rem",
            background: "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 15px rgba(79, 70, 229, 0.4)",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "1.1rem"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)"
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.6)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(79, 70, 229, 0.4)"
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>📝</span> Request a Book
        </button>
      </div>

      {/* Popup for requesting a book */}
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(15, 23, 42, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            backdropFilter: "blur(8px)",
          }}
          onClick={() => setShowPopup(false)}
        >
          <div
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              padding: "2rem",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "500px",
              position: "relative",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.3)",
              border: "1px solid transparent",
              backgroundImage: "linear-gradient(rgba(30, 41, 59, 0.95), rgba(30, 41, 59, 0.95)), linear-gradient(135deg, rgba(79, 70, 229, 0.4), rgba(168, 85, 247, 0.4))",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPopup(false)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(239, 68, 68, 0.2)",
                color: "#fff",
                border: "1px solid rgba(239, 68, 68, 0.5)",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "bold",
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

            <h3 style={{
              fontSize: "1.5rem",
              color: "#a855f7",
              marginBottom: "1.5rem",
              textAlign: "center",
              fontWeight: "bold"
            }}>
              Request a Book
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem",
              }}
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                style={{
                  padding: "0.9rem 1.2rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  fontFamily: "Arial, Helvetica, sans-serif",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#e2e8f0",
                  fontSize: "1rem",
                  transition: "all 0.3s ease",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(168, 85, 247, 0.3)"
                  e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.5)"
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none"
                }}
              />
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author (optional)"
                style={{
                  padding: "0.9rem 1.2rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  fontFamily: "Arial, Helvetica, sans-serif",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#e2e8f0",
                  fontSize: "1rem",
                  transition: "all 0.3s ease",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(168, 85, 247, 0.3)"
                  e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.5)"
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none"
                }}
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "Physical Book" | "E-Book" | "Physical/E-Book")}
                style={{
                  padding: "0.9rem 1.2rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  fontFamily: "Arial, Helvetica, sans-serif",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#e2e8f0",
                  fontSize: "1rem",
                  transition: "all 0.3s ease",
                  outline: "none",
                  appearance: "none",
                  backgroundImage:
                    'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23a855f7%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem top 50%",
                  backgroundSize: "0.65rem auto",
                  paddingRight: "2.5rem",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(168, 85, 247, 0.3)"
                  e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.5)"
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none"
                }}
              >
                <option value="Physical Book">Physical Book</option>
                <option value="E-Book">E-Book</option>
                <option value="Physical/E-Book">Physical/E-Book</option>
              </select>
              <div style={{ position: "relative" }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{
                    padding: "0.9rem 1.2rem",
                    width: "100%",
                    borderRadius: "12px",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#e2e8f0",
                    cursor: "pointer",
                  }}
                />
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#d1d5db",
                    marginTop: "0.5rem",
                    fontStyle: "italic",
                  }}
                >
                  Upload an image (JPEG, PNG) for the request (optional).
                </p>
              </div>
              <button
                onClick={() => {
                  handleRequest()
                  if (!error) setShowPopup(false)
                }}
                disabled={isLoading}
                style={{
                  padding: "1rem 2rem",
                  background: "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.7 : 1,
                  fontFamily: "Arial, Helvetica, sans-serif",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 15px rgba(79, 70, 229, 0.4)",
                  marginTop: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = "translateY(-3px)"
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.6)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(79, 70, 229, 0.4)"
                  }
                }}
              >
                {isLoading ? "Requesting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
      <h2
        style={{
          margin: "2.5rem 0 1.5rem",
          color: "#a855f7",
          fontSize: "2rem",
          fontWeight: "bold",
          textShadow: "0 0 10px rgba(168, 85, 247, 0.3)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        {/* <span style={{ fontSize: "1.5rem" }}>📋</span> My Requests */}
      </h2>
      {isLoading ? (
        <p style={{ textAlign: "center", color: "#a855f7" }}>Loading requests...</p>
      ) : requests.length > 0 ? (
        requests.map((req) => (
          <div
            key={req._id}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              padding: "1.5rem",
              borderRadius: "16px",
              marginBottom: "1.5rem",
              display: "flex",
              gap: "1.5rem",
              cursor: "pointer",
              position: "relative",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)"
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(0, 0, 0, 0.3)"
              e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.3)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.2)"
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"
            }}
          >
            {req.image ? (
              <img
                src={`http://localhost:5000${req.image.startsWith("/files/") ? req.image : `/files/${req.image}`}`}
                alt={req.title}
                style={{
                  width: "120px",
                  height: "180px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
                  border: "2px solid rgba(168, 85, 247, 0.3)",
                }}
                onError={(e) => {
                  console.warn(`❌ MyRequests: Failed to load image: ${req.image}`)
                  e.currentTarget.src = "https://via.placeholder.com/120x180?text=No+Image"
                }}
              />
            ) : (
              <div
                style={{
                  width: "120px",
                  height: "180px",
                  background: "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#a0aec0",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
                  border: "2px solid rgba(168, 85, 247, 0.3)",
                }}
              >
                No Image
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: "0 0 0.8rem",
                  color: "#a855f7",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                }}
              >
                {req.title}
              </h3>
              <p
                style={{
                  margin: "0.5rem 0",
                  color: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Author:</span> {req.author || "Unknown"}
              </p>
              <p
                style={{
                  margin: "0.5rem 0",
                  color: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Type:</span>
                <span
                  style={{
                    background:
                      req.type === "Physical Book"
                        ? "rgba(76, 175, 80, 0.2)"
                        : req.type === "E-Book"
                          ? "rgba(33, 150, 243, 0.2)"
                          : "rgba(156, 39, 176, 0.2)",
                    padding: "0.3rem 0.8rem",
                    borderRadius: "20px",
                    fontSize: "0.9rem",
                    border: `1px solid ${
                      req.type === "Physical Book"
                        ? "rgba(76, 175, 80, 0.4)"
                        : req.type === "E-Book"
                          ? "rgba(33, 150, 243, 0.4)"
                          : "rgba(156, 39, 176, 0.4)"
                    }`,
                  }}
                >
                  {req.type}
                </span>
              </p>
            </div>
            <button
              onClick={() => handleDeleteRequest(req._id)}
              style={{
                padding: "0.6rem 1.2rem",
                background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                height: "fit-content",
                fontSize: "0.9rem",
                fontWeight: "bold",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 10px rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)"
                e.currentTarget.style.boxShadow = "0 6px 15px rgba(239, 68, 68, 0.5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(239, 68, 68, 0.3)"
              }}
            >
              <span style={{ fontSize: "1rem" }}>🗑️</span> Delete
            </button>
          </div>
        ))
      ) : (
        <p style={{ textAlign: "center", color: "#d1d5db" }}>No requests found</p>
      )}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            border: "none",
            boxShadow: "0 4px 15px rgba(79, 70, 229, 0.5)",
            zIndex: 100,
            transition: "all 0.3s ease",
            fontSize: "1.5rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-5px)"
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(79, 70, 229, 0.7)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(79, 70, 229, 0.5)"
          }}
        >
          ↑
        </button>
      )}
    </div>
  )
}

export default MyRequests
