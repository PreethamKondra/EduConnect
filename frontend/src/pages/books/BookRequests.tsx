"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import "../../assets/styles/global.css"
import { useEffect, useState } from "react"

interface User {
  name: string
  email: string
  year?: string | null
  _id: string
}

interface Request {
  _id: string
  title: string
  author?: string
  type: "Physical Book" | "E-Book" | "Physical/E-Book"
  image?: string | null
  user: User
}

const BookRequests: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [requests, setRequests] = useState<Request[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const navigate = useNavigate()
  const token = localStorage.getItem("token")

  useEffect(() => {
    if (!token) {
      navigate("/login")
      return
    }
    fetchRequests("")
  }, [navigate, token])

  const fetchRequests = async (query: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const url = query
        ? `http://localhost:5000/request/search?query=${encodeURIComponent(query)}`
        : `http://localhost:5000/request/all`
      console.log("✅ BookRequests: Fetching from:", url)
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      console.log("✅ BookRequests: Fetch response:", {
        status: response.status,
        data: data,
      })
      if (response.ok && data.success) {
        const fetchedRequests = data.requests || []
        setRequests(
          fetchedRequests.map((req: Request) => ({
            ...req,
            image: req.image || null,
            user: req.user || { _id: "", name: "Unknown", email: "Unknown", year: null },
          })),
        )
        if (fetchedRequests.length === 0) {
          setError(query ? "No requests found for this query." : "No requests available in database.")
        }
      } else {
        let errorMessage = data.message || "Failed to fetch requests"
        if (response.status === 401) {
          errorMessage = "Session expired. Please log in again."
          localStorage.removeItem("token")
          navigate("/login")
        } else if (response.status === 500) {
          errorMessage = "Server error: Please try again later."
        } else if (response.status === 400) {
          errorMessage = "Bad request: Check query parameters."
        }
        setError(errorMessage)
        setRequests([])
      }
    } catch (err: any) {
      const errorMessage = err.message.includes("Failed to fetch")
        ? "Network error: Ensure backend is running at http://localhost:5000."
        : "Error fetching requests: " + err.message
      setError(errorMessage)
      setRequests([])
      console.error("❌ BookRequests: Fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("✅ BookRequests: Search triggered with query:", searchQuery)
    fetchRequests(searchQuery)
  }

  const handleRequestClick = (req: Request) => {
    setSelectedRequest(selectedRequest?._id === req._id ? null : req)
    console.log("✅ BookRequests: Request selected:", req.title)
  }

  const handleChat = (email: string) => {
    console.log(`✅ BookRequests: Initiating chat with email: ${email}`)
    navigate(`/chat?email=${encodeURIComponent(email)}`)
  }

  const closeModal = () => {
    setSelectedRequest(null)
  }

  const [showScrollTop, setShowScrollTop] = useState(false)

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
      behavior: "smooth",
    })
  }

  return (
    <div
      style={{
        background: "transparent",
        position: "relative",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#e2e8f0",
      }}
    >
      {error && (
        <div
          style={{
            color: "#ff8787",
            marginBottom: "1.5rem",
            background: "rgba(239, 68, 68, 0.1)",
            padding: "1rem",
            borderRadius: "10px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textAlign: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>⚠️</span> {error}
          <button
            onClick={() => fetchRequests(searchQuery)}
            style={{
              padding: "0.5rem 1rem",
              background: "linear-gradient(90deg, #4f46e5, #6b21a8)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              marginLeft: "0.5rem",
            }}
          >
            Retry
          </button>
        </div>
      )}
      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          background: "rgba(30, 41, 59, 0.4)",
          padding: "1.2rem",
          borderRadius: "16px",
          backdropFilter: "blur(8px)",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
        }}
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search requests by title or author..."
          style={{
            flex: 1,
            padding: "0.9rem 1.2rem",
            borderRadius: "12px",
            border: "1px solid rgba(168, 85, 247, 0.3)",
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
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "0.9rem 2rem",
            background: "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
            fontWeight: "bold",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(79, 70, 229, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
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
              Searching...
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
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Search
            </>
          )}
        </button>
      </form>
      {isLoading ? (
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
              width: "50px",
              height: "50px",
              border: "5px solid rgba(168, 85, 247, 0.3)",
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
          <p>Loading requests...</p>
        </div>
      ) : requests.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            width: "100%",
          }}
        >
          {requests.map((req, index) => (
            <div
              key={`${req._id}-${req.type}-${index}`}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "1.2rem",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                cursor: "pointer",
                position: "relative",
                boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
                transition: "all 0.3s ease",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                height: "100%",
              }}
              onClick={() => handleRequestClick(req)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)"
                e.currentTarget.style.boxShadow = "0 12px 30px rgba(168, 85, 247, 0.2)"
                e.currentTarget.style.border = "1px solid rgba(168, 85, 247, 0.2)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.15)"
                e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.05)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                  height: "100%",
                }}
              >
                {req.image ? (
                  <img
                    src={
                      req.image.startsWith("/files/")
                        ? `http://localhost:5000${req.image}`
                        : `http://localhost:5000/files/${req.image}`
                    }
                    alt={req.title}
                    style={{
                      width: "160px",
                      height: "220px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
                      border: "2px solid rgba(168, 85, 247, 0.3)",
                      transition: "all 0.3s ease",
                    }}
                    onError={(e) => {
                      console.log(`❌ BookRequests: Failed to load image: ${req.image}`, e)
                      e.currentTarget.src = "https://via.placeholder.com/160x220?text=No+Image"
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "160px",
                      height: "220px",
                      background: "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#a0aec0",
                      fontSize: "1rem",
                      fontWeight: "bold",
                      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
                      border: "2px solid rgba(168, 85, 247, 0.3)",
                    }}
                  >
                    No Image
                  </div>
                )}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    width: "100%",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 0.8rem",
                      color: "#a855f7",
                      fontSize: "1.3rem",
                      fontWeight: "bold",
                      lineHeight: "1.3",
                    }}
                  >
                    {req.title}
                  </h3>
                  <p
                    style={{
                      margin: "0 0 0.5rem",
                      color: "#e2e8f0",
                      fontSize: "0.95rem",
                    }}
                  >
                    <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Author:</span> {req.author || "Unknown"}
                  </p>
                  <p
                    style={{
                      margin: "0 0 0.8rem",
                      fontSize: "0.95rem",
                    }}
                  >
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
                        fontSize: "0.85rem",
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
                  <p
                    style={{
                      margin: "0",
                      fontSize: "0.9rem",
                      color: "#d1d5db",
                    }}
                  >
                    Requested by: {req.user.name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            color: "#d1d5db",
            padding: "3rem 1rem",
            background: "rgba(30, 41, 59, 0.4)",
            borderRadius: "16px",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: "0 auto 1rem", opacity: 0.5 }}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>No requests found</p>
          <p>Try a different search or check back later</p>
        </div>
      )}
      {selectedRequest && (
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
          onClick={(e) => {
            e.stopPropagation()
            closeModal()
          }}
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
              backgroundImage:
                "linear-gradient(rgba(30, 41, 59, 0.95), rgba(30, 41, 59, 0.95)), linear-gradient(135deg, rgba(79, 70, 229, 0.4), rgba(168, 85, 247, 0.4))",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeModal()
              }}
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {selectedRequest.image ? (
                <img
                  src={
                    selectedRequest.image.startsWith("/files/")
                      ? `http://localhost:5000${selectedRequest.image}`
                      : `http://localhost:5000/files/${selectedRequest.image}`
                  }
                  alt={selectedRequest.title}
                  style={{
                    width: "120px",
                    height: "180px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
                    border: "2px solid rgba(168, 85, 247, 0.3)",
                  }}
                  onError={(e) => {
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
                    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
                    border: "2px solid rgba(168, 85, 247, 0.3)",
                  }}
                >
                  No Image
                </div>
              )}

              <div>
                <h3
                  style={{
                    fontSize: "1.5rem",
                    color: "#a855f7",
                    margin: "0 0 0.5rem",
                    fontWeight: "bold",
                  }}
                >
                  {selectedRequest.title}
                </h3>
                <p
                  style={{
                    margin: "0 0 0.3rem",
                    fontSize: "1rem",
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Author:</span>{" "}
                  {selectedRequest.author || "Unknown"}
                </p>
                <p
                  style={{
                    margin: "0 0 0.3rem",
                    fontSize: "1rem",
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Type:</span> {selectedRequest.type}
                </p>
              </div>
            </div>

            {selectedRequest.user && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "1.2rem",
                  borderRadius: "12px",
                  marginBottom: "1.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <p
                  style={{
                    fontSize: "1.1rem",
                    marginBottom: "0.5rem",
                    color: "#e2e8f0",
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Requester:</span> {selectedRequest.user.name}
                </p>
                <p style={{ fontSize: "0.95rem", color: "#e2e8f0" }}>
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Contact:</span> {selectedRequest.user.email}
                  {selectedRequest.user.year && (
                    <span>
                      <br />
                      <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Year:</span> {selectedRequest.user.year}
                    </span>
                  )}
                </p>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleChat(selectedRequest.user.email)
              }}
              style={{
                padding: "0.8rem 1.5rem",
                background: "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                boxShadow: "0 4px 10px rgba(79, 70, 229, 0.4)",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                width: "100%",
                fontSize: "1.1rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)"
                e.currentTarget.style.boxShadow = "0 6px 15px rgba(79, 70, 229, 0.6)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(79, 70, 229, 0.4)"
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Chat with Requester
            </button>
          </div>
        </div>
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

export default BookRequests
