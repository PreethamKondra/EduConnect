"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../assets/styles/global.css"

// Add this near the top of your file, after your imports
declare global {
  interface WebSocket {
    intentionalClose?: boolean
  }
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<
    { senderId: string; receiverId: string; text: string; timestamp: string; senderName?: string }[]
  >([])
  const [newMessage, setNewMessage] = useState("")
  const [receiverId, setReceiverId] = useState<string | null>(null)
  const [receiverName, setReceiverName] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchUsers, setSearchUsers] = useState<{ _id: string; name: string; email: string; year: string }[]>([])
  const [chatPartners, setChatPartners] = useState<
    { _id: string; name: string; email: string; lastMessageTimestamp: string }[]
  >([])
  const [friends, setFriends] = useState<{ _id: string; name: string; email: string; year: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [shouldScrollToLatest, setShouldScrollToLatest] = useState<boolean>(false)
  const [noSearchResults, setNoSearchResults] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)
  const hasLoadedHistory = useRef<{ [key: string]: boolean }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem("token")
  const currentUserId = token ? JSON.parse(atob(token.split(".")[1])).userId : null

  const fetchChatPartners = async () => {
    if (!token) {
      navigate("/login")
      return
    }
    try {
      const response = await fetch("http://localhost:5000/chat/chat-partners", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        const filteredPartners = data.partners.filter((partner: { _id: string }) => partner._id !== currentUserId)
        setChatPartners(
          filteredPartners.sort(
            (a: { _id: string; name: string; email: string; lastMessageTimestamp: string }, 
             b: { _id: string; name: string; email: string; lastMessageTimestamp: string }) => 
              new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
          )
        )
      } else {
        setError(data.message || "Failed to load chat partners")
      }
    } catch (err) {
      console.error("Chat partners fetch error:", err)
      setError("Failed to load chat partners")
    }
  }

  const fetchFriends = async () => {
    if (!token) {
      navigate("/login")
      return
    }
    try {
      const response = await fetch("http://localhost:5000/friends/list", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.friends) {
        setFriends(data.friends)
        setError(null)
      } else {
        setError(data.message || "Failed to load friends")
      }
    } catch (err) {
      console.error("Friends fetch error:", err)
      setError("Failed to load friends")
    }
  }

  const connectWebSocket = async (newReceiverId: string | null, newReceiverName: string | null) => {
    if (!newReceiverId || !currentUserId || !token) {
      navigate("/login")
      return
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }

    setIsLoading(true)
    setError(null)

    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.intentionalClose = true
      ws.current.close(1000, "Switching chat")
    }

    await new Promise((resolve) => setTimeout(resolve, 200))

    ws.current = new WebSocket("ws://localhost:5000/chat/ws", ["chat"])
    ws.current.intentionalClose = false

    ws.current.onopen = () => {
      console.log("WebSocket connected for receiverId:", newReceiverId)
      setIsLoading(false)
      setError(null)
      setReceiverId(newReceiverId)
      setReceiverName(newReceiverName)
      if (ws.current) {
        ws.current.send(JSON.stringify({ type: "auth", token, receiverId: newReceiverId }))
      }
      setShouldScrollToLatest(true)
    }

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log("WebSocket message received:", message)
      if (message.type === "auth" && message.error) {
        setError(message.error)
        ws.current?.close()
      } else if (message.text) {
        const isForCurrentChat =
          (message.receiverId === newReceiverId && message.senderId === currentUserId) ||
          (message.senderId === newReceiverId && message.receiverId === currentUserId)

        if (isForCurrentChat) {
          setMessages((prev) => {
            const existingMessageIndex = prev.findIndex(
              (m) => m.timestamp === message.timestamp && m.senderId === message.senderId
            )
            if (existingMessageIndex >= 0) return prev
            return [...prev, { ...message, senderName: message.senderName || "Unknown" }].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            )
          })
          setShouldScrollToLatest(true)
        }

        if (!chatPartners.some((p) => p._id === message.senderId) && message.senderId !== currentUserId) {
          fetchChatPartners()
        }
      }
    }

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error)
      setIsLoading(false)
      setError("Connection error. Attempting to reconnect...")
    }

    ws.current.onclose = (event) => {
      console.log("WebSocket disconnected", event.code, event.reason)

      if (!ws.current?.intentionalClose) {
        setError("Connection lost. Reconnecting...")

        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket(newReceiverId, newReceiverName)
        }, 5000)
      } else {
        console.log("Intentional WebSocket close, not reconnecting")
      }
    }

    if (newReceiverId) {
      await loadHistory(newReceiverId, !hasLoadedHistory.current[newReceiverId])
      hasLoadedHistory.current[newReceiverId] = true
    }
  }

  const loadHistory = async (receiverId: string, forceReload = false) => {
    if (!token) {
      navigate("/login")
      return
    }

    if (!forceReload && hasLoadedHistory.current[receiverId] && !location.search.includes("email=")) return

    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:5000/chat/messages/${receiverId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        const messagesWithNames = await Promise.all(
          data.messages.map(async (msg: { sender: string; receiver: string; text: string; timestamp: string }) => {
            let senderName = "Unknown"
            if (msg.sender === currentUserId) {
              senderName = "You"
            } else {
              const partner = chatPartners.find((p) => p._id === msg.sender) || friends.find((f) => f._id === msg.sender)
              if (partner) senderName = partner.name
              else {
                try {
                  const userResponse = await fetch(`http://localhost:5000/profile/${msg.sender}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  const userData = await userResponse.json()
                  if (userData.success) senderName = userData.profile.name
                } catch (err) {
                  console.error("Error fetching user profile:", err)
                }
              }
            }
            return { ...msg, senderId: msg.sender, receiverId: msg.receiver, senderName }
          })
        )

        setMessages(messagesWithNames.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()))
        hasLoadedHistory.current[receiverId] = true
        setShouldScrollToLatest(true)
        console.log(`✅ Chat: Loaded ${messagesWithNames.length} messages for user ${receiverId}`)
      } else {
        setError(data.message || "Failed to load history")
      }
    } catch (err) {
      console.error("History load error:", err)
      setError("Failed to load chat history")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchChatPartners()
      await fetchFriends()

      const params = new URLSearchParams(location.search)
      const userId = params.get("userId")
      const name = params.get("name")
      const email = params.get("email")

      if (userId && name && userId !== currentUserId) {
        console.log("✅ Chat: Direct user selection from URL params")
        handleSelectUser(userId, decodeURIComponent(name))
      } else if (email && token) {
        console.log("✅ Chat: Handling email parameter:", email)
        try {
          const response = await fetch(`http://localhost:5000/chat/search-users?query=${encodeURIComponent(email)}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
          const data = await response.json()
          if (data.success && data.users.length === 1) {
            const user = data.users[0]
            console.log("✅ Chat: Found user for email:", user)

            if (hasLoadedHistory.current[user._id]) {
              delete hasLoadedHistory.current[user._id]
            }

            handleSelectUser(user._id, user.name)
          } else {
            setError("User not found for this email.")
          }
        } catch (err) {
          console.error("Search by email failed:", err)
          setError("Failed to search user by email.")
        }
      }
    }

    fetchInitialData()

    return () => {
      if (ws.current) ws.current.close(1000, "Component unmount")
    }
  }, [navigate, token, location])

  const handleSearch = async () => {
    if (!searchQuery) {
      setSearchUsers([])
      setNoSearchResults(false)
      return
    }
    if (!token) {
      navigate("/login")
      return
    }
    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:5000/chat/search-users?query=${searchQuery}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.success && data.users.length > 0) {
        setSearchUsers(data.users)
        setNoSearchResults(false)
        setError(null)
      } else {
        setSearchUsers([])
        setNoSearchResults(true)
        setError(null)
      }
    } catch (err) {
      console.error("Search error:", err)
      setError("Failed to search users")
      setNoSearchResults(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectUser = async (userId: string, name: string) => {
    if (receiverId === userId) {
      scrollToLatestMessage()
      return
    }

    setMessages([])
    await connectWebSocket(userId, name)

    setChatPartners((prevPartners) => {
      const existingPartnerIndex = prevPartners.findIndex((p) => p._id === userId)
      if (existingPartnerIndex >= 0) {
        const updatedPartners = [...prevPartners]
        updatedPartners[existingPartnerIndex] = { ...updatedPartners[existingPartnerIndex], name }
        return updatedPartners
      }
      return [{ _id: userId, name, email: "", lastMessageTimestamp: new Date().toISOString() }, ...prevPartners]
    })

    hasLoadedHistory.current[userId] = false
    setShouldScrollToLatest(true)
  }

  const handleChatWithUser = (userId: string, name: string) => {
    handleSelectUser(userId, name)
    setSearchQuery("")
    setSearchUsers([])
    setNoSearchResults(false)
  }

  const handleAddFriend = async (friendId: string) => {
    if (!token) {
      navigate("/login")
      return
    }
    try {
      const response = await fetch("http://localhost:5000/friends/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      })
      const data = await response.json()
      if (data.message.includes("added")) {
        const friend = searchUsers.find((u) => u._id === friendId)
        if (friend) setFriends([...friends, friend])
        setSearchUsers(searchUsers.filter((u) => u._id !== friendId))
        await fetchFriends()
      } else if (data.message.includes("removed")) {
        setFriends(friends.filter((f) => f._id !== friendId))
        await fetchFriends()
      } else {
        setError(data.message || "Failed to toggle friend")
      }
    } catch (err) {
      console.error("Toggle friend error:", err)
      setError("Failed to toggle friend")
    }
  }

  const handleSendMessage = () => {
    if (!currentUserId || !receiverId || !newMessage.trim() || !token) {
      setError("Please select a receiver and enter a message.")
      return
    }
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const messageData = {
        senderId: currentUserId,
        receiverId,
        text: newMessage,
        timestamp: new Date().toISOString(),
      }
      ws.current.send(JSON.stringify(messageData))
      setNewMessage("")
      setError(null)
      setShouldScrollToLatest(true)
    } else {
      setError("WebSocket connection not open.")
    }
  }

  const handleShowFriends = () => {
    setShowFriends(true)
  }

  const handleCloseFriends = () => {
    setShowFriends(false)
  }

  const handleChatFromFriend = (friendId: string, name: string) => {
    handleSelectUser(friendId, name)
    setShowFriends(false)
  }

  const handleRemoveFriend = async (friendId: string) => {
    if (!token) {
      navigate("/login")
      return
    }
    try {
      const response = await fetch("http://localhost:5000/friends/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      })
      const data = await response.json()
      if (data.message.includes("removed")) {
        setFriends(friends.filter((f) => f._id !== friendId))
        await fetchFriends()
      } else {
        setError(data.message || "Failed to remove friend")
      }
    } catch (err) {
      console.error("Remove friend error:", err)
      setError("Failed to remove friend")
    }
  }

  const scrollToLatestMessage = () => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    if (shouldScrollToLatest) {
      scrollToLatestMessage()
      setShouldScrollToLatest(false)
    }
  }, [messages, shouldScrollToLatest])

  // Animated background effect
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

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "stretch",
        padding: "2rem",
        background: "transparent",
        fontFamily: "'Manrope', sans-serif",
        color: "#e2e8f0",
        position: "relative",
        overflow: "hidden",
        zIndex: 1,
      }}
    >
      <button
        onClick={() => {
          if (ws.current) ws.current.close(1000, "Navigating home")
          navigate("/home")
        }}
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          padding: "0.8rem 2.5rem",
          background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
          color: "#fff",
          border: "none",
          borderRadius: "25px",
          fontSize: "1.2rem",
          cursor: "pointer",
          transition: "all 0.3s ease",
          boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)",
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontWeight: "bold",
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = "translateY(-4px) scale(1.05)"
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.6)"
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = "translateY(0) scale(1)"
          e.currentTarget.style.boxShadow = "0 4px 15px rgba(239, 68, 68, 0.4)"
        }}
      >
        <span>←</span> Back to Home
      </button>

      <div
        style={{
          width: "30%",
          minHeight: "80vh",
          background: "rgba(30, 41, 59, 0.6)",
          backdropFilter: "blur(12px)",
          padding: "2rem",
          borderRadius: "20px",
          marginRight: "2rem",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          scrollbarWidth: "none" /* Firefox */,
          msOverflowStyle: "none" /* IE and Edge */,
        }}
        className="hide-scrollbar"
      >
        <h2
          style={{
            fontSize: "2.2rem",
            marginBottom: "1.5rem",
            color: "#a855f7",
            textAlign: "center",
            textShadow: "0 0 15px rgba(168, 85, 247, 0.5)",
            fontWeight: "bold",
            letterSpacing: "1px",
            marginTop: "3rem",
          }}
        >
          Connect Hub
        </h2>

        {error && (
          <div
            style={{
              color: "#fff",
              marginBottom: "1.5rem",
              fontWeight: "bold",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              padding: "1rem",
              borderRadius: "10px",
              textAlign: "center",
              backdropFilter: "blur(5px)",
              animation: "fadeIn 0.5s ease-out",
            }}
          >
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>⚠️</span>
            {error}
          </div>
        )}

        <div
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            position: "relative",
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: "30px",
            overflow: "hidden",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
          }}
        >
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "1rem 1.5rem",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "#e2e8f0",
              fontSize: "1.1rem",
              transition: "all 0.3s ease",
            }}
            onFocus={(e) => (e.target.style.background = "rgba(255, 255, 255, 0.1)")}
            onBlur={(e) => (e.target.style.background = "transparent")}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: "1rem 2rem",
              background: "linear-gradient(45deg, #a855f7, #9333ea)",
              color: "#fff",
              border: "none",
              borderRadius: "0 30px 30px 0",
              fontSize: "1.2rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 6px 20px rgba(168, 85, 247, 0.4)",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.transform = "scale(1.05)"
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(168, 85, 247, 0.6)"
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.transform = "scale(1)"
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(168, 85, 247, 0.4)"
            }}
          >
            <span role="img" aria-label="search">
              🔍
            </span>
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.5rem",
            marginBottom: "1.5rem",
            maxHeight: "calc(80vh - 18rem)",
            scrollbarWidth: "none" /* Firefox */,
            msOverflowStyle: "none" /* IE and Edge */,
          }}
          className="hide-scrollbar"
        >
          {isLoading && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "2rem",
                flexDirection: "column",
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
              <p style={{ color: "#a855f7", fontWeight: "bold" }}>Searching...</p>
            </div>
          )}

          {noSearchResults && !isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: "2rem 1rem",
                background: "rgba(0, 0, 0, 0.2)",
                borderRadius: "16px",
                border: "1px dashed rgba(168, 85, 247, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <span style={{ fontSize: "3rem" }}>🔍</span>
              <p style={{ fontSize: "1.2rem" }}>No users found</p>
              <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>Try a different search term</p>
            </div>
          )}

          {searchQuery && searchUsers.length > 0
            ? searchUsers.map((user) => (
                <div
                  key={user._id}
                  style={{
                    padding: "1.2rem",
                    marginBottom: "1rem",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#e2e8f0",
                    borderRadius: "15px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"
                    e.currentTarget.style.transform = "translateY(-3px)"
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.2)"
                    e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.3)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)"
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{user.name}</span>
                    <span style={{ fontSize: "0.9rem", opacity: 0.7 }}>{user.email}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.8rem" }}>
                    <button
                      onClick={() => handleChatWithUser(user._id, user.name)}
                      style={{
                        padding: "0.7rem 1.5rem",
                        background: "linear-gradient(90deg, #4f46e5, #6b21a8)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "20px",
                        fontSize: "1rem",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 15px rgba(79, 70, 229, 0.4)",
                        fontWeight: "bold",
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.transform = "translateY(-2px) scale(1.05)"
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.6)"
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.transform = "translateY(0) scale(1)"
                        e.currentTarget.style.boxShadow = "0 4px 15px rgba(79, 70, 229, 0.4)"
                      }}
                    >
                      Chat
                    </button>
                    {!friends.some((f) => f._id === user._id) && (
                      <button
                        onClick={() => handleAddFriend(user._id)}
                        style={{
                          padding: "0.7rem 1.5rem",
                          background: "linear-gradient(90deg, #10b981, #059669)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "20px",
                          fontSize: "1rem",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
                          fontWeight: "bold",
                        }}
                        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.currentTarget.style.transform = "translateY(-2px) scale(1.05)"
                          e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.6)"
                        }}
                        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.currentTarget.style.transform = "translateY(0) scale(1)"
                          e.currentTarget.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.4)"
                        }}
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                </div>
              ))
            : !searchQuery &&
              !noSearchResults &&
              chatPartners.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleSelectUser(user._id, user.name)}
                  style={{
                    padding: "1.2rem",
                    marginBottom: "1rem",
                    background: receiverId === user._id ? "linear-gradient(90deg, rgba(79, 70, 229, 0.3), rgba(107, 33, 168, 0.3))" : "rgba(255, 255, 255, 0.1)",
                    color: "#e2e8f0",
                    borderRadius: "15px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: receiverId === user._id ? "0 6px 20px rgba(79, 70, 229, 0.3)" : "0 4px 12px rgba(0, 0, 0, 0.1)",
                    border: receiverId === user._id ? "1px solid rgba(79, 70, 229, 0.5)" : "1px solid rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                  onMouseEnter={(e) => {
                    if (receiverId !== user._id) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"
                      e.currentTarget.style.transform = "translateY(-3px)"
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.2)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (receiverId !== user._id) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)"
                    }
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "linear-gradient(45deg, #a855f7, #6366f1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "1.2rem",
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{user.name}</div>
                  </div>
                  {receiverId === user._id && (
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "#10b981",
                        boxShadow: "0 0 10px #10b981",
                      }}
                    ></div>
                  )}
                </div>
              ))}

          {!searchQuery && !noSearchResults && chatPartners.length === 0 && !isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: "2rem 1rem",
                background: "rgba(0, 0, 0, 0.2)",
                borderRadius: "16px",
                border: "1px dashed rgba(168, 85, 247, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <span style={{ fontSize: "3rem" }}>💬</span>
              <p style={{ fontSize: "1.2rem" }}>No conversations yet</p>
              <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>Search for users to start chatting</p>
            </div>
          )}
        </div>

        <button
          onClick={handleShowFriends}
          style={{
            position: "absolute",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "0.9rem 0",
            background: "linear-gradient(90deg, #4f46e5, #6b21a8)",
            color: "#fff",
            border: "none",
            borderRadius: "25px",
            fontSize: "1.2rem",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(79, 70, 229, 0.4)",
            width: "90%",
            fontWeight: "bold",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.transform = "translateX(-50%) scale(1.05)"
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.6)"
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.transform = "translateX(-50%) scale(1)"
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(79, 70, 229, 0.4)"
          }}
        >
          Friends List
        </button>
      </div>

      {receiverId ? (
        <div
          style={{
            flex: 1,
            minHeight: "80vh",
            background: "rgba(30, 41, 59, 0.6)",
            backdropFilter: "blur(12px)",
            padding: "2rem",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "1.2rem",
              borderRadius: "15px",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "45px",
                  height: "45px",
                  borderRadius: "50%",
                  background: "linear-gradient(45deg, #a855f7, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "1.5rem",
                }}
              >
                {receiverName?.charAt(0).toUpperCase()}
              </div>
              <h2
                style={{
                  fontSize: "1.8rem",
                  margin: 0,
                  color: "#a855f7",
                  fontWeight: "bold",
                  textShadow: "0 0 10px rgba(168, 85, 247, 0.3)",
                }}
              >
                {receiverName}
              </h2>
            </div>

            {receiverName && (
              <div>
                <button
                  onClick={() =>
                    friends.some((f) => f._id === receiverId)
                      ? handleRemoveFriend(receiverId!)
                      : handleAddFriend(receiverId!)
                  }
                  style={{
                    padding: "0.7rem 1.5rem",
                    background: friends.some((f) => f._id === receiverId)
                      ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                      : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "20px",
                    fontSize: "1rem",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: friends.some((f) => f._id === receiverId)
                      ? "0 4px 15px rgba(239, 68, 68, 0.4)"
                      : "0 4px 15px rgba(16, 185, 129, 0.4)",
                    fontWeight: "bold",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.transform = "scale(1.05)"
                    e.currentTarget.style.boxShadow = friends.some((f) => f._id === receiverId)
                      ? "0 6px 20px rgba(239, 68, 68, 0.6)"
                      : "0 6px 20px rgba(16, 185, 129, 0.6)"
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.transform = "scale(1)"
                    e.currentTarget.style.boxShadow = friends.some((f) => f._id === receiverId)
                      ? "0 4px 15px rgba(239, 68, 68, 0.4)"
                      : "0 4px 15px rgba(16, 185, 129, 0.4)"
                  }}
                >
                  {friends.some((f) => f._id === receiverId) ? "Remove Friend" : "Add Friend"}
                </button>
              </div>
            )}
          </div>

          {isLoading && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "2rem",
                flexDirection: "column",
                gap: "1rem",
                flex: 1,
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  border: "4px solid rgba(168, 85, 247, 0.3)",
                  borderRadius: "50%",
                  borderTopColor: "#a855f7",
                  animation: "spin 1s linear infinite",
                }}
              ></div>
              <p style={{ color: "#a855f7", fontWeight: "bold", fontSize: "1.2rem" }}>Loading conversation...</p>
            </div>
          )}

          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: "auto",
              marginBottom: "1.5rem",
              padding: "1.5rem",
              background: "rgba(30, 41, 59, 0.4)",
              backdropFilter: "blur(10px)",
              borderRadius: "20px",
              boxShadow: "inset 0 6px 20px rgba(0, 0, 0, 0.1)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "calc(80vh - 12rem)",
              scrollbarWidth: "none" /* Firefox */,
              msOverflowStyle: "none" /* IE and Edge */,
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
            className="hide-scrollbar"
          >
            {messages.length === 0 && !isLoading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  flexDirection: "column",
                  gap: "1rem",
                  opacity: 0.7,
                }}
              >
                <span style={{ fontSize: "3rem" }}>💬</span>
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem 1.5rem",
                  background: msg.senderId === currentUserId ? "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)" : "rgba(255, 255, 255, 0.1)",
                  color: msg.senderId === currentUserId ? "#fff" : "#e2e8f0",
                  borderRadius: msg.senderId === currentUserId ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
                  maxWidth: "70%",
                  alignSelf: msg.senderId === currentUserId ? "flex-end" : "flex-start",
                  boxShadow: msg.senderId === currentUserId ? "0 4px 15px rgba(79, 70, 229, 0.4)" : "0 4px 15px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  border: msg.senderId === currentUserId ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
                  animation: "fadeIn 0.3s ease-out",
                }}
              >
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: msg.senderId === currentUserId ? "rgba(255, 255, 255, 0.8)" : "#d1d5db",
                    marginBottom: "0.3rem",
                    fontWeight: "bold",
                  }}
                >
                  {msg.senderName || "Unknown"}
                </div>
                <span style={{ wordBreak: "break-word", lineHeight: "1.5" }}>{msg.text}</span>
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.6,
                    marginTop: "0.5rem",
                    textAlign: msg.senderId === currentUserId ? "right" : "left",
                  }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              marginTop: "auto",
              position: "sticky",
              bottom: "0",
              background: "rgba(30, 41, 59, 0.4)",
              padding: "0.5rem 0",
              zIndex: 1,
            }}
          >
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{
                flex: 1,
                padding: "1.2rem 1.8rem",
                borderRadius: "25px",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                fontSize: "1.2rem",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.1)",
                transition: "all 0.3s ease",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.2)"
                e.target.style.borderColor = "rgba(168, 85, 247, 0.5)"
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.1)"
                e.target.style.borderColor = "rgba(168, 85, 247, 0.3)"
              }}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              style={{
                padding: "1.2rem 2.8rem",
                background: "linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "25px",
                fontSize: "1.3rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 6px 20px rgba(79, 70, 229, 0.4)",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = "translateY(-3px) scale(1.05)"
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(79, 70, 229, 0.6)"
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)"
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.4)"
              }}
            >
              <span>📤</span> Send
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: "80vh",
            background: "rgba(30, 41, 59, 0.6)",
            backdropFilter: "blur(12px)",
            padding: "2rem",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            textAlign: "center",
            gap: "2rem",
          }}
        >
          <div style={{ fontSize: "5rem" }}>💬</div>
          <h2
            style={{
              fontSize: "2.5rem",
              color: "#a855f7",
              textShadow: "0 0 15px rgba(168, 85, 247, 0.3)",
              fontWeight: "bold",
            }}
          >
            Select a conversation
          </h2>
          <p style={{ fontSize: "1.2rem", maxWidth: "500px", lineHeight: "1.6", opacity: 0.8 }}>
            Choose an existing conversation from the sidebar or search for users to start a new chat.
          </p>
        </div>
      )}

      {showFriends && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "40%",
            height: "100vh",
            background: "rgba(30, 41, 59, 0.8)",
            backdropFilter: "blur(12px)",
            padding: "2rem",
            borderRadius: "20px 0 0 20px",
            transform: showFriends ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.3s ease",
            zIndex: 1000,
            overflowY: "auto",
            boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            scrollbarWidth: "none" /* Firefox */,
            msOverflowStyle: "none" /* IE and Edge */,
            animation: "slideIn 0.3s ease-out",
          }}
          className="hide-scrollbar"
        >
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              paddingBottom: "1rem",
            }}
          >
            <h2
              style={{
                fontSize: "2rem",
                color: "#a855f7",
                textShadow: "0 0 10px rgba(168, 85, 247, 0.3)",
                fontWeight: "bold",
                margin: 0,
              }}
            >
              Friends List
            </h2>
            <button
              onClick={handleCloseFriends}
              style={{
                padding: "0.8rem",
                background: "rgba(239, 68, 68, 0.2)",
                color: "#fff",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                fontSize: "1.2rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = "rotate(90deg) scale(1.1)"
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.4)"
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = "rotate(0) scale(1)"
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"
              }}
            >
              ✕
            </button>
          </div>

          {friends.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                background: "rgba(0, 0, 0, 0.2)",
                borderRadius: "16px",
                border: "1px dashed rgba(168, 85, 247, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <span style={{ fontSize: "3rem" }}>👥</span>
              <p style={{ fontSize: "1.2rem" }}>No friends yet</p>
              <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>Search for users to add friends</p>
            </div>
          )}

          {friends.map((friend) => (
            <div
              key={friend._id}
              style={{
                padding: "1.2rem",
                marginBottom: "1rem",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                borderRadius: "15px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"
                e.currentTarget.style.transform = "translateY(-3px)"
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.2)"
                e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.3)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)"
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "linear-gradient(45deg, #a855f7, #6366f1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                  }}
                >
                  {friend.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{friend.name}</div>
                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>{friend.email}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.8rem" }}>
                <button
                  onClick={() => handleChatFromFriend(friend._id, friend.name)}
                  style={{
                    padding: "0.7rem 1.5rem",
                    background: "linear-gradient(90deg, #4f46e5, #6b21a8)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "20px",
                    fontSize: "1rem",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 15px rgba(79, 70, 229, 0.4)",
                    fontWeight: "bold",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.transform = "translateY(-2px) scale(1.05)"
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.6)"
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)"
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(79, 70, 229, 0.4)"
                  }}
                >
                  Chat
                </button>
                <button
                  onClick={() => handleRemoveFriend(friend._id)}
                  style={{
                    padding: "0.7rem 1.5rem",
                    background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "20px",
                    fontSize: "1rem",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)",
                    fontWeight: "bold",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.transform = "translateY(-2px) scale(1.05)"
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.6)"
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)"
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(239, 68, 68, 0.4)"
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Chat 