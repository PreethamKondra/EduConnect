"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../../assets/styles/global.css"
import { useEffect } from "react"

interface Upload {
  _id: string
  title: string
  author?: string
  type: "Physical Book" | "E-Book"
  image?: string | null
  file?: string | null
}

const ContributeBooks: React.FC = () => {
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [type, setType] = useState<"Physical Book" | "E-Book">("Physical Book")
  const [file, setFile] = useState<File | null>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
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
    fetchUploads()
  }, [navigate, token])

  const fetchUploads = async () => {
    try {
      setIsLoading(true)
      console.log("✅ ContributeBooks: Fetching uploads")
      const response = await fetch("http://localhost:5000/upload/myUploads", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      console.log("✅ ContributeBooks: Fetch uploads response:", data)
      if (response.ok && data.success) {
        setUploads(
          data.uploads.map((upload: any) => ({
            ...upload,
            image: upload.image || null,
            file: upload.file || null,
          })),
        )
        if (data.uploads.length === 0) {
          setError("No uploads found for this user.")
        } else {
          setError(null)
        }
      } else {
        let errorMessage = data.message || "Failed to fetch uploads"
        if (response.status === 401) {
          errorMessage = "Session expired. Please log in again."
          localStorage.removeItem("token")
          navigate("/login")
        }
        setError(errorMessage)
        setUploads([])
      }
    } catch (err) {
      setError("Network error: Ensure backend is running at http://localhost:5000.")
      setUploads([])
      console.error("❌ ContributeBooks: Fetch uploads error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!title || !type) {
      setError("Title and type are required")
      return
    }
    if (type === "E-Book" && !file) {
      setError("File is required for E-Books")
      return
    }
    const formData = new FormData()
    formData.append("title", title)
    if (author) formData.append("author", author)
    formData.append("type", type)
    if (file) formData.append("file", file)

    try {
      setIsLoading(true)
      console.log("✅ ContributeBooks: Uploading book:", { title, type, file: file?.name })
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await response.json()
      console.log("✅ ContributeBooks: Upload response:", { status: response.status, data })
      if (response.ok && data.success) {
        setUploads([...uploads, { ...data.book, image: data.book.image || null, file: data.book.file || null }])
        setTitle("")
        setAuthor("")
        setFile(null)
        setError(null)
        alert(`${type} uploaded successfully!`)
      } else {
        setError(data.message || "Upload failed")
      }
    } catch (err) {
      setError("Network error: Ensure backend is running.")
      console.error("❌ ContributeBooks: Upload error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUpload = async (id: string) => {
    try {
      console.log("✅ ContributeBooks: Attempting to delete upload:", id)
      const response = await fetch(`http://localhost:5000/upload/delete/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      console.log("✅ ContributeBooks: Delete response:", data)
      if (response.ok && data.success) {
        setUploads(uploads.filter((upload) => upload._id !== id))
        alert("Upload deleted successfully")
        setError(null)
        fetchUploads() // Refresh uploads
      } else {
        let errorMessage = data.message || "Failed to delete upload"
        if (response.status === 401) {
          errorMessage = "Session expired. Please log in again."
          localStorage.removeItem("token")
          navigate("/login")
        }
        setError(errorMessage)
      }
    } catch (err) {
      setError("Network error: Ensure backend is running.")
      console.error("❌ ContributeBooks: Delete error:", err)
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
    <div style={{ background: "transparent", position: "relative" }}>
      {error && <p style={{ color: "#ff8787", marginBottom: "1rem", fontWeight: "bold" }}>Error: {error}</p>}
      {isLoading && <p style={{ textAlign: "center", color: "#a855f7" }}>Loading...</p>}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            color: "#a855f7",
            fontSize: "2rem",
            fontWeight: "bold",
            textShadow: "0 0 10px rgba(168, 85, 247, 0.3)",
          }}
        >
          My Contributions
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
            fontSize: "1.1rem",
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
          <span style={{ fontSize: "1.2rem" }}>📚</span> Contribute a Book
        </button>
      </div>

      {/* Popup for contributing a book */}
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
              backgroundImage:
                "linear-gradient(rgba(30, 41, 59, 0.95), rgba(30, 41, 59, 0.95)), linear-gradient(135deg, rgba(79, 70, 229, 0.4), rgba(168, 85, 247, 0.4))",
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

            <h3
              style={{
                fontSize: "1.5rem",
                color: "#a855f7",
                marginBottom: "1.5rem",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              Upload a Book or E-Book
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
                onChange={(e) => setType(e.target.value as "Physical Book" | "E-Book")}
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
                <option value="E-Book">E-Book (PDF, Word, PPT)</option>
              </select>
              <div style={{ position: "relative" }}>
                <input
                  type="file"
                  accept={type === "Physical Book" ? "image/*" : ".pdf,.doc,.docx,.ppt,.pptx"}
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
                  {type === "Physical Book"
                    ? "Upload an image (JPEG, PNG) for Physical Books (optional)."
                    : "Upload a readable file (PDF, Word, PPT) for E-Books (required)."}
                </p>
              </div>
              <button
                onClick={() => {
                  handleUpload()
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
                {isLoading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
      <h2
        style={{
          margin: "2rem 0 1.5rem",
          color: "#a855f7",
          fontSize: "2rem",
          fontWeight: "bold",
          textShadow: "0 0 10px rgba(168, 85, 247, 0.3)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        {/* <span style={{ fontSize: "1.5rem" }}>📚</span> My Uploads */}
      </h2>
      {isLoading ? (
        <p style={{ textAlign: "center", color: "#a855f7" }}>Loading uploads...</p>
      ) : uploads.length > 0 ? (
        uploads.map((upload) => (
          <div
            key={upload._id}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              padding: "1.5rem",
              borderRadius: "16px",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)"
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(168, 85, 247, 0.2)"
              e.currentTarget.style.border = "1px solid rgba(168, 85, 247, 0.2)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.15)"
              e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.05)"
            }}
          >
            <div style={{ display: "flex", gap: "1rem" }}>
              {upload.image ? (
                <img
                  src={`http://localhost:5000${upload.image.startsWith("/files/") ? upload.image : `/files/${upload.image}`}`}
                  alt={upload.title}
                  style={{
                    width: "120px",
                    height: "180px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
                    border: "2px solid rgba(168, 85, 247, 0.3)",
                    transition: "all 0.3s ease",
                  }}
                  onError={(e) => {
                    console.warn(`❌ Upload: Failed to load image: ${upload.image}`)
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
              <div style={{ flex: 1, marginLeft: "1.5rem" }}>
                <h3
                  style={{
                    margin: "0 0 0.8rem",
                    color: "#a855f7",
                    fontSize: "1.4rem",
                    fontWeight: "bold",
                  }}
                >
                  {upload.title}
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
                  <span style={{ fontWeight: "bold", color: "#90e0ef" }}>Author:</span> {upload.author || "Unknown"}
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
                        upload.type === "Physical Book" ? "rgba(76, 175, 80, 0.2)" : "rgba(33, 150, 243, 0.2)",
                      padding: "0.3rem 0.8rem",
                      borderRadius: "20px",
                      fontSize: "0.9rem",
                      border: `1px solid ${upload.type === "Physical Book" ? "rgba(76, 175, 80, 0.4)" : "rgba(33, 150, 243, 0.4)"}`,
                    }}
                  >
                    {upload.type}
                  </span>
                </p>
                {upload.file && (
                  <a
                    href={`http://localhost:5000${upload.file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: "0.8rem",
                      padding: "0.5rem 1.2rem",
                      background: "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)",
                      color: "#fff",
                      textDecoration: "none",
                      borderRadius: "8px",
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
                )}
              </div>
            </div>
            <button
              onClick={() => handleDeleteUpload(upload._id)}
              style={{
                padding: "0.7rem 1.3rem",
                background: "linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontWeight: "bold",
                boxShadow: "0 4px 10px rgba(239, 68, 68, 0.3)",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)"
                e.currentTarget.style.boxShadow = "0 6px 15px rgba(239, 68, 68, 0.5)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(239, 68, 68, 0.3)"
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>🗑️</span> Delete
            </button>
          </div>
        ))
      ) : (
        <p style={{ textAlign: "center", color: "#d1d5db" }}>You haven't uploaded anything yet.</p>
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

export default ContributeBooks
