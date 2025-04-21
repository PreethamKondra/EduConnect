"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../../assets/styles/global.css"

interface Uploader {
  name: string
  email: string
  year?: string | null
}

interface WishlistItem {
  bookId: string
  title: string
  author?: string
  image?: string | null
  file?: string | null
  type: "Physical Book" | "E-Book"
  uploader?: Uploader
}

const Wishlist: React.FC = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const navigate = useNavigate()
  const token = localStorage.getItem("token")
  const API_URL = "http://localhost:5000"

  useEffect(() => {
    if (!token) {
      navigate("/login")
      return
    }
    fetchWishlist()
  }, [navigate, token])

  const fetchWishlist = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/wishlist/view`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      console.log("✅ Wishlist: Fetch response:", data)
      if (response.ok) {
        setWishlist(data.items || [])
        setError(null)
      } else {
        setError(data.message || "Failed to fetch wishlist")
      }
    } catch (err) {
      setError("Error fetching wishlist")
      console.error("❌ Wishlist: Fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFromWishlist = async (bookId: string) => {
    try {
      const response = await fetch(`${API_URL}/wishlist/remove`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookId }),
      })
      const data = await response.json()
      console.log("✅ Wishlist: Remove response:", data)
      if (response.ok) {
        setWishlist(wishlist.filter((item) => item.bookId !== bookId))
        setSelectedItem(null)
        alert("Removed from wishlist")
      } else {
        setError(data.message || "Failed to remove from wishlist")
      }
    } catch (err) {
      setError("Error removing from wishlist")
      console.error("❌ Wishlist: Remove error:", err)
    }
  }

  const handleItemClick = (item: WishlistItem) => {
    setSelectedItem(selectedItem?.bookId === item.bookId ? null : item)
    console.log("✅ Wishlist: Item selected:", item)
  }

  const closeModal = () => {
    setSelectedItem(null)
  }

  const handleDownloadEbook = (fileUrl: string) => {
    console.log("✅ Wishlist: Downloading e-book from:", fileUrl)
    window.open(`${API_URL}${fileUrl}?view=false`, "_blank")
  }

  const handleChat = () => {
    if (selectedItem?.uploader?.email && selectedItem.uploader.name) {
      const email = encodeURIComponent(selectedItem.uploader.email)
      const name = encodeURIComponent(selectedItem.uploader.name)
      navigate(`/chat?email=${email}&name=${name}`)
    } else {
      alert("Uploader info not available")
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
        </div>
      )}
      <h2
        style={{
          marginBottom: "1.5rem",
          color: "#a855f7",
          fontSize: "2rem",
          fontWeight: "bold",
          textShadow: "0 0 10px rgba(168, 85, 247, 0.3)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>❤️</span> My Wishlist
      </h2>
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
          <p>Loading your wishlist...</p>
        </div>
      ) : wishlist.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            width: "100%",
          }}
        >
          {wishlist.map((item, index) => (
            <div
              key={`${item.bookId}-${item.type}-${index}`}
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
              onClick={() => handleItemClick(item)}
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
                {item.image ? (
                  <img
                    src={`${API_URL}${item.image}`}
                    alt={item.title}
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
                      console.log(`❌ Wishlist: Failed to load image: ${item.image}`)
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
                    {item.title}
                  </h3>
                  <p
                    style={{
                      margin: "0 0 0.5rem",
                      color: "#e2e8f0",
                      fontSize: "0.95rem",
                    }}
                  >
                    <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Author:</span> {item.author || "Unknown"}
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
                          item.type === "Physical Book" ? "rgba(76, 175, 80, 0.2)" : "rgba(33, 150, 243, 0.2)",
                        padding: "0.3rem 0.8rem",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        border: `1px solid ${item.type === "Physical Book" ? "rgba(76, 175, 80, 0.4)" : "rgba(33, 150, 243, 0.4)"}`,
                      }}
                    >
                      {item.type}
                    </span>
                  </p>
                  {item.type === "E-Book" && item.file && (
                    <div style={{ marginTop: "auto", width: "100%" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadEbook(item.file!)
                        }}
                        style={{
                          padding: "0.6rem 1.2rem",
                          background: "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "10px",
                          textDecoration: "none",
                          display: "inline-block",
                          fontWeight: "bold",
                          boxShadow: "0 4px 10px rgba(79, 70, 229, 0.4)",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
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
                        Download E-Book
                      </button>
                    </div>
                  )}
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
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Your wishlist is empty</p>
          <p>Browse books and add them to your wishlist</p>
        </div>
      )}
      {selectedItem && (
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
              {selectedItem.image ? (
                <img
                  src={`${API_URL}${selectedItem.image}`}
                  alt={selectedItem.title}
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
                  {selectedItem.title}
                </h3>
                <p
                  style={{
                    margin: "0 0 0.3rem",
                    fontSize: "1rem",
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Author:</span>{" "}
                  {selectedItem.author || "Unknown"}
                </p>
                <p
                  style={{
                    margin: "0 0 0.3rem",
                    fontSize: "1rem",
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Type:</span> {selectedItem.type}
                </p>
              </div>
            </div>

            {selectedItem.uploader && (
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
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Owner:</span> {selectedItem.uploader.name}
                </p>
                <p style={{ fontSize: "0.95rem", color: "#e2e8f0" }}>
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Contact:</span> {selectedItem.uploader.email}
                  {selectedItem.uploader.year && (
                    <span>
                      <br />
                      <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Year:</span> {selectedItem.uploader.year}
                    </span>
                  )}
                </p>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleChat()
                }}
                style={{
                  padding: "0.8rem 1rem",
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
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Chat
              </button>

              {selectedItem.type === "E-Book" && selectedItem.file && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate("/quiz", {
                      state: {
                        fileUrl: `${API_URL}${selectedItem.file}`,
                        fileName: selectedItem.title,
                      },
                    })
                  }}
                  style={{
                    padding: "0.8rem 1rem",
                    background: "linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    boxShadow: "0 4px 10px rgba(155, 89, 182, 0.4)",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)"
                    e.currentTarget.style.boxShadow = "0 6px 15px rgba(155, 89, 182, 0.6)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "0 4px 10px rgba(155, 89, 182, 0.4)"
                  }}
                >
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
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                  </svg>
                  Quiz
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveFromWishlist(selectedItem.bookId)
                }}
                style={{
                  padding: "0.8rem 1rem",
                  background: "linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  boxShadow: "0 4px 10px rgba(239, 68, 68, 0.4)",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)"
                  e.currentTarget.style.boxShadow = "0 6px 15px rgba(239, 68, 68, 0.6)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "0 4px 10px rgba(239, 68, 68, 0.4)"
                }}
              >
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
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Remove
              </button>
            </div>
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

export default Wishlist
