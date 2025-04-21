"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import "../../assets/styles/global.css"
import { useEffect, useState } from "react"

interface Book {
  _id: string
  title: string
  author?: string
  image?: string | null
  file?: string | null
  type: "Physical Book" | "E-Book"
  uploader?: { _id: string; name: string; email: string; year?: string | null }
}

const BrowseBooks: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [items, setItems] = useState<Book[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Book | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const navigate = useNavigate()
  const token = localStorage.getItem("token")
  const API_URL = "http://localhost:5000"

  useEffect(() => {
    if (!token) {
      navigate("/login")
      return
    }
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]))
      const userId = decoded.userId
      console.log("✅ BrowseBooks: Decoded token userId:", userId)
      // Ensure the ID is stored as a string
      setCurrentUserId(String(userId))
    } catch (err) {
      console.error("❌ BrowseBooks: Error decoding token:", err)
    }
    fetchItems("")
  }, [navigate, token])

  const fetchItems = async (query: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const url = query ? `${API_URL}/search?query=${encodeURIComponent(query)}` : `${API_URL}/search/all`

      console.log("✅ BrowseBooks: Fetching from:", url)
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      console.log("✅ BrowseBooks: Fetch response:", {
        status: response.status,
        data: data,
      })

      if (response.ok && data.success) {
        const books = data.books || []
        const ebooks = data.ebooks || []
        const allItems = [...books, ...ebooks]

        // Log all user IDs for debugging
        console.log("✅ Current user ID:", currentUserId)
        allItems.forEach((item: Book, index) => {
          const uploaderId = item.uploader?._id
          console.log(
            `Item ${index}: Title=${item.title}, UploaderID=${uploaderId}, Match=${uploaderId === currentUserId}`,
          )
        })

        // Filter out user's own uploads - using direct comparison and logging
        const filteredItems = allItems.filter((item: Book) => {
          if (!item.uploader || !item.uploader._id) {
            return true // Keep items with no uploader info
          }

          const uploaderId = String(item.uploader._id)
          const isOwnUpload = uploaderId === String(currentUserId)

          console.log(
            `Filtering: ${item.title}, UploaderID=${uploaderId}, CurrentUserID=${currentUserId}, IsOwnUpload=${isOwnUpload}`,
          )

          return !isOwnUpload // Keep only items that are NOT the user's own uploads
        })

        // Process the filtered items
        const processedItems = filteredItems.map((item: Book) => ({
          ...item,
          image: item.image || null,
          file: item.file || null,
          uploader: item.uploader || { _id: "", name: "Unknown", email: "Unknown", year: null },
          type: item.type || "Physical Book",
        }))

        console.log("✅ Items after filtering:", processedItems.length)
        setItems(processedItems)

        if (processedItems.length === 0) {
          setError(query ? "No books or E-Books found for this query." : "No books or E-Books available in database.")
        }
      } else {
        let errorMessage = data.message || "Failed to fetch items"
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
        setItems([])
      }
    } catch (err: any) {
      const errorMessage = err.message.includes("Failed to fetch")
        ? `Network error: Ensure backend is running at ${API_URL}.`
        : "Error fetching items: " + err.message
      setError(errorMessage)
      setItems([])
      console.error("❌ BrowseBooks: Fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("✅ BrowseBooks: Search triggered with query:", searchQuery)
    fetchItems(searchQuery)
  }

  const handleAddToWishlist = async (item: Book) => {
    try {
      console.log("✅ BrowseBooks: Adding to wishlist:", {
        _id: item._id,
        title: item.title,
        type: item.type,
        uploader: item.uploader,
      })
      const response = await fetch(`${API_URL}/wishlist/add-by-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          _id: item._id, // Pass the ID directly
          title: item.title,
          author: item.author || null,
          type: item.type,
        }),
      })
      const data = await response.json()
      console.log("✅ BrowseBooks: Wishlist response:", data)
      if (response.ok && data.success) {
        alert("Added to wishlist successfully!")
      } else {
        setError(data.message || "Failed to add to wishlist.")
      }
    } catch (err) {
      setError("Error adding to wishlist.")
      console.error("❌ BrowseBooks: Wishlist error:", err)
    }
  }

  const handleChatWithOwner = (email: string) => {
    if (!email) {
      setError("No owner email available.")
      return
    }
    navigate(`/chat?email=${encodeURIComponent(email)}`)
  }

  const handleItemClick = (item: Book) => {
    setSelectedItem(selectedItem?._id === item._id ? null : item)
    console.log("✅ BrowseBooks: Item selected:", item)
  }

  const closeModal = () => {
    setSelectedItem(null)
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
        <div style={{ color: "#ff8787", marginBottom: "1rem", textAlign: "center" }}>
          <p>{error}</p>
          <button
            onClick={() => fetchItems(searchQuery)}
            style={{
              padding: "0.5rem 1rem",
              background: "linear-gradient(90deg, #4f46e5, #6b21a8)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              marginTop: "0.5rem",
            }}
          >
            Retry
          </button>
        </div>
      )}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search books or E-Books..."
          style={{
            flex: 1,
            padding: "0.7rem",
            borderRadius: "10px",
            border: "none",
            background: "rgba(255, 255, 255, 0.1)",
            color: "#e2e8f0",
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "0.7rem 2rem",
            background: "linear-gradient(90deg, #4f46e5, #6b21a8)",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? "Searching..." : "Search"}
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
          <p>Loading amazing books for you...</p>
        </div>
      ) : items.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            width: "100%",
          }}
        >
          {items.map((item, index) => (
            <div
              key={`${item._id}-${item.type}-${index}`}
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
                      console.log(`❌ BrowseBooks: Failed to load image: ${item.image}`)
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
                      <a
                        href={`${API_URL}${item.file}?view=false`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
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
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: "center", color: "#d1d5db" }}>No books or E-Books found.</p>
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
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeModal()
              }}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
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
                zIndex: 10,
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

            {/* Content container */}
            <div style={{ display: "flex", padding: "20px" }}>
              {/* Book image */}
              <div style={{ marginRight: "20px" }}>
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
              </div>

              {/* Book details */}
              <div>
                <h3
                  style={{
                    fontSize: "1.8rem",
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
                    color: "#64748b",
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Author:</span>{" "}
                  {selectedItem.author || "Unknown"}
                </p>
                <p
                  style={{
                    margin: "0 0 0.3rem",
                    fontSize: "1rem",
                    color: "#64748b",
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Type:</span> {selectedItem.type}
                </p>
              </div>
            </div>

            {/* Owner info */}
            {selectedItem.uploader && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "1.2rem",
                  margin: "0 20px 20px",
                  borderRadius: "12px",
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
                <p style={{ fontSize: "0.95rem", color: "#e2e8f0", margin: 0 }}>
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

            {/* Action buttons */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                padding: "0 20px 20px",
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleChatWithOwner(selectedItem.uploader?.email || "")
                }}
                style={{
                  padding: "0.8rem 1rem",
                  background: "#6366f1",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#4f46e5"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#6366f1"
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

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddToWishlist(selectedItem)
                }}
                style={{
                  padding: "0.8rem 1rem",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#dc2626"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ef4444"
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
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                Wishlist
              </button>
            </div>

            {/* Quiz button for E-Books */}
            {selectedItem.type === "E-Book" && selectedItem.file && (
              <div style={{ padding: "0 20px 20px" }}>
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
                    background: "#9333ea",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#7e22ce"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#9333ea"
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
                  Take Quiz
                </button>
              </div>
            )}
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

export default BrowseBooks
