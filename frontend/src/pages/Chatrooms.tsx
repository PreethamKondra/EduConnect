import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/global.css';

interface Message {
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: string;
  isCurrentUser?: boolean; // Added to support backend's new flag
}

interface Room {
  _id: string;
  name: string;
  creator?: string;
  members?: string[];
}

const Chatrooms: React.FC = () => {
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [createdRooms, setCreatedRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shouldScrollToLatest, setShouldScrollToLatest] = useState<boolean>(false);
  const ws = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');
  const [currentUserId, setCurrentUserId] = useState<string | null>(token ? JSON.parse(atob(token.split('.')[1])).userId : null);
  const currentUsername = token ? JSON.parse(atob(token.split('.')[1])).username : null;
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const newUserId = token ? JSON.parse(atob(token.split('.')[1])).userId : null;
    if (newUserId !== currentUserId) {
      setCurrentUserId(newUserId);
      console.log('Updated currentUserId:', newUserId);
    }
  }, [token]);

  const fetchMyRooms = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/chatrooms/my-rooms', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.rooms) {
        setMyRooms(data.rooms);
      } else {
        setError(data.message || 'Failed to load rooms');
      }
    } catch (err) {
      console.error('Fetch rooms error:', err);
      setError('Failed to load rooms');
    }
  };

  const fetchCreatedRooms = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/chatrooms/created-rooms', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.rooms) {
        setCreatedRooms(data.rooms);
      } else {
        setError(data.message || 'Failed to load created rooms');
      }
    } catch (err) {
      console.error('Fetch created rooms error:', err);
      setError('Failed to load created rooms');
    }
  };

  const connectWebSocket = async (roomId: string) => {
    if (ws.current) {
      ws.current.close(1000, 'Switching room');
      ws.current = null;
    }
    if (!roomId || !currentUserId || !token) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    ws.current = new WebSocket('ws://localhost:5000/chat/ws', ['chat']);

    ws.current.onopen = () => {
      console.log('WebSocket connected for room:', roomId);
      setError(null);
      setIsLoading(false);
      const token = localStorage.getItem('token');
      const updatedUserId = token ? JSON.parse(atob(token.split('.')[1])).userId : null;
      setCurrentUserId(updatedUserId); // Sync before auth
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'auth', token, roomId }));
      }
      setShouldScrollToLatest(true);
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message, 'Current User ID:', currentUserId);
        if (message.type === 'auth' && message.error) {
          setError(`Authentication failed: ${message.error}`);
          ws.current?.close();
          return;
        }
        if (message.type === 'error') {
          setError(`Server error: ${message.message}`);
          return;
        }
        if (message.roomId === roomId && message.text && !message.receiverId) {
          setMessages((prev) => {
            const exists = prev.some(m => m.timestamp === message.timestamp && m.senderId === message.senderId);
            if (!exists) {
              const newMessage: Message = {
                ...message,
                senderName: message.senderName || (message.senderId === currentUserId ? 'You' : 'Unknown'),
                isCurrentUser: message.isCurrentUser ?? (message.senderId === currentUserId), // Use backend flag or fallback
              };
              const updatedMessages = [...prev, newMessage].sort(
                (a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              setShouldScrollToLatest(true);
              return updatedMessages;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
        setError('Failed to process message');
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Attempting to reconnect...');
      setIsLoading(false);
    };

    ws.current.onclose = () => {
      console.log('WebSocket closed for room:', roomId);
      setError('Connection lost. Attempting to reconnect...');
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = setTimeout(() => {
        if (selectedRoom?._id === roomId) {
          connectWebSocket(roomId);
        }
      }, 5000);
    };

    try {
      const response = await fetch(`http://localhost:5000/chatrooms/messages/${roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.messages) {
        const messagesWithNames = data.messages.map((msg: Message) => ({
          ...msg,
          senderName: msg.senderName || (msg.senderId === currentUserId ? 'You' : 'Unknown'),
          isCurrentUser: msg.isCurrentUser ?? (msg.senderId === currentUserId), // Use backend flag or fallback
        }));
        setMessages(messagesWithNames.sort((a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
        setShouldScrollToLatest(true);
      } else if (data.message) {
        setError(data.message);
      }
    } catch (err) {
      console.error('Load messages error:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRooms();
    fetchCreatedRooms();
    return () => {
      if (ws.current) ws.current.close(1000, 'Component unmount');
    };
  }, [navigate, token]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const newUserId = token ? JSON.parse(atob(token.split('.')[1])).userId : null;
    if (newUserId !== currentUserId) {
      setCurrentUserId(newUserId);
      console.log('Updated currentUserId:', newUserId);
    }
  }, [token]);

  // Animated background effect
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
      document.body.removeChild(canvas);
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      setError('Room name is required');
      return;
    }
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/chatrooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newRoomName }),
      });
      const data = await response.json();
      if (data.room) {
        setMyRooms([...myRooms, data.room]);
        setCreatedRooms([...createdRooms, data.room]);
        setNewRoomName('');
        setShowCreateModal(false);
        setError(null);
      } else {
        setError(data.message || 'Failed to create room');
      }
    } catch (err) {
      console.error('Create room error:', err);
      setError('Failed to create room');
    }
  };

  const handleSearchRooms = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/chatrooms/search?query=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.rooms) {
        setSearchResults(data.rooms);
      } else {
        setError(data.message || 'No rooms found');
      }
    } catch (err) {
      console.error('Search rooms error:', err);
      setError('Failed to search rooms');
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/chatrooms/join/${roomId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.room) {
        setMyRooms((prev) => [...prev.filter(r => r._id !== roomId), data.room]);
        setSearchResults([]);
        setSearchQuery('');
        setError(null);
        handleSelectRoom(data.room);
      } else {
        setError(data.message || 'Failed to join room');
      }
    } catch (err) {
      console.error('Join room error:', err);
      setError('Failed to join room');
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/chatrooms/leave/${roomId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.message) {
        setMyRooms(myRooms.filter(r => r._id !== roomId));
        setCreatedRooms(createdRooms.filter(r => r._id !== roomId));
        if (selectedRoom?._id === roomId) {
          setSelectedRoom(null);
          setMessages([]);
          if (ws.current) ws.current.close(1000, 'Room left');
        }
        setError(null);
      } else {
        setError(data.message || 'Failed to leave room');
      }
    } catch (err) {
      console.error('Leave room error:', err);
      setError('Failed to leave room');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/chatrooms/delete/${roomId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.message) {
        setMyRooms(myRooms.filter(r => r._id !== roomId));
        setCreatedRooms(createdRooms.filter(r => r._id !== roomId));
        if (selectedRoom?._id === roomId) {
          setSelectedRoom(null);
          setMessages([]);
          if (ws.current) ws.current.close(1000, 'Room deleted');
        }
        setError(null);
      } else {
        setError(data.message || 'Failed to delete room');
      }
    } catch (err) {
      console.error('Delete room error:', err);
      setError('Failed to delete room');
    }
  };

  const handleSelectRoom = (room: Room) => {
    if (selectedRoom?._id !== room._id) {
      setSelectedRoom(room);
      setError(null);
      setMessages([]); // Clear messages first
      setShouldScrollToLatest(true);
      connectWebSocket(room._id);
      if (!myRooms.some(r => r._id === room._id)) {
        setMyRooms([...myRooms, room]);
      }
    }
  };

  const handleSendMessage = () => {
    if (!currentUserId || !selectedRoom || !newMessage.trim() || !token) {
      setError('Please select a room and enter a message');
      return;
    }
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const messageData = {
        roomId: selectedRoom._id,
        senderId: currentUserId,
        senderName: currentUsername,
        text: newMessage,
        timestamp: new Date().toISOString(),
      };
      ws.current.send(JSON.stringify(messageData));
      setNewMessage('');
      setError(null);
      setShouldScrollToLatest(true);
    } else {
      setError('WebSocket connection not open');
    }
  };

  const scrollToLatestMessage = () => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (shouldScrollToLatest) {
      scrollToLatestMessage();
      setShouldScrollToLatest(false);
    }
  }, [messages, shouldScrollToLatest]);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        padding: '2rem',
        background: 'transparent',
        fontFamily: "'Manrope', sans-serif",
        color: '#e2e8f0',
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      <button
        onClick={() => {
          if (ws.current) ws.current.close(1000, 'Navigating home');
          navigate('/home');
        }}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          padding: '0.8rem 2.5rem',
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '25px',
          fontSize: '1.2rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 'bold',
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.6)';
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
        }}
      >
        <span>←</span> Back to Home
      </button>
      <div
        style={{
          width: '30%',
          minHeight: '80vh',
          background: 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(12px)',
          padding: '2rem',
          borderRadius: '20px',
          marginRight: '2rem',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="hide-scrollbar"
      >
        <h2
          style={{
            fontSize: '2.2rem',
            marginBottom: '1.5rem',
            color: '#a855f7',
            textAlign: 'center',
            textShadow: '0 0 15px rgba(168, 85, 247, 0.5)',
            fontWeight: 'bold',
            letterSpacing: '1px',
            marginTop: '3rem',
          }}
        >
          Community Lounge
        </h2>

        {error && (
          <div
            style={{
              color: '#fff',
              marginBottom: '1.5rem',
              fontWeight: 'bold',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              padding: '1rem',
              borderRadius: '10px',
              textAlign: 'center',
              backdropFilter: 'blur(5px)',
              animation: 'fadeIn 0.5s ease-out',
            }}
          >
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            `}</style>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>⚠️</span>
            {error}
          </div>
        )}

        <div
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '30px',
            overflow: 'hidden',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}
        >
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) {
                setSearchResults([]);
              }
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchRooms()}
            style={{
              flex: 1,
              padding: '1rem 1.5rem',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: '#e2e8f0',
              fontSize: '1.1rem',
              transition: 'all 0.3s ease',
            }}
            onFocus={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.1)')}
            onBlur={(e) => (e.target.style.background = 'transparent')}
          />
          <button
            onClick={handleSearchRooms}
            style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(45deg, #a855f7, #9333ea)',
              color: '#fff',
              border: 'none',
              borderRadius: '0 30px 30px 0',
              fontSize: '1.2rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 6px 20px rgba(168, 85, 247, 0.4)',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(168, 85, 247, 0.6)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 85, 247, 0.4)';
            }}
          >
            <span role="img" aria-label="search">🔍</span>
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.5rem',
            marginBottom: '1.5rem',
            maxHeight: 'calc(80vh - 18rem)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="hide-scrollbar"
        >
          {(searchResults.length > 0 ? searchResults : myRooms).map((room) => {
            const isMember = myRooms.some(r => r._id === room._id);
            return (
              <div
                key={room._id}
                style={{
                  padding: '1.2rem',
                  marginBottom: '1rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  borderRadius: '15px',
                  cursor: isMember ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
                onMouseEnter={(e) => {
                  if (isMember) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onClick={() => isMember && handleSelectRoom(room)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{room.name}{createdRooms.some(r => r._id === room._id) ? ' (Admin)' : ''}</span>
                </div>
                {!isMember && searchResults.length > 0 && (
                  <button
                    onClick={() => handleJoinRoom(room._id)}
                    style={{
                      padding: '0.7rem 1.5rem',
                      background: 'linear-gradient(90deg, #4f46e5, #6b21a8)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '20px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
                      fontWeight: 'bold',
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.6)';
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(79, 70, 229, 0.4)';
                    }}
                  >
                    Join
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.9rem 0',
            background: 'linear-gradient(90deg, #4f46e5, #6b21a8)',
            color: '#fff',
            border: 'none',
            borderRadius: '25px',
            fontSize: '1.2rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
            width: '90%',
            fontWeight: 'bold',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.6)';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(79, 70, 229, 0.4)';
          }}
        >
          Create Room
        </button>
      </div>
      {selectedRoom && (
        <div
          style={{
            flex: 1,
            minHeight: '80vh',
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(12px)',
            padding: '2rem',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1.2rem',
              borderRadius: '15px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '45px',
                  height: '45px',
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #a855f7, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.5rem',
                }}
              >
                {selectedRoom.name.charAt(0).toUpperCase()}
              </div>
              <h2
                style={{
                  fontSize: '1.8rem',
                  margin: 0,
                  color: '#a855f7',
                  fontWeight: 'bold',
                  textShadow: '0 0 10px rgba(168, 85, 247, 0.3)',
                }}
              >
                {selectedRoom.name}
              </h2>
            </div>

            <div>
              <button
                onClick={() => handleLeaveRoom(selectedRoom._id)}
                style={{
                  padding: '0.7rem 1.5rem',
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.6)';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
                }}
              >
                {createdRooms.some(r => r._id === selectedRoom._id) ? 'Leave' : 'Leave'}
              </button>
              {createdRooms.some(r => r._id === selectedRoom._id) && (
                <button
                  onClick={() => handleDeleteRoom(selectedRoom._id)}
                  style={{
                    padding: '0.7rem 1.5rem',
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    marginLeft: '0.5rem',
                    fontWeight: 'bold',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.6)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {isLoading && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem',
                flexDirection: 'column',
                gap: '1rem',
                flex: 1,
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '50%',
                  borderTopColor: '#a855f7',
                  animation: 'spin 1s linear infinite',
                }}
              ></div>
              <p style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '1.2rem' }}>Loading conversation...</p>
            </div>
          )}

          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: '1.5rem',
              padding: '1.5rem',
              background: 'rgba(30, 41, 59, 0.4)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              boxShadow: 'inset 0 6px 20px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(80vh - 12rem)',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
            className="hide-scrollbar"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem 1.5rem',
                  background:
                    msg.isCurrentUser ?? msg.senderId === currentUserId
                      ? 'linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)'
                      : 'rgba(255, 255, 255, 0.1)',
                  color: msg.isCurrentUser ?? msg.senderId === currentUserId ? '#fff' : '#e2e8f0',
                  borderRadius: msg.isCurrentUser ?? msg.senderId === currentUserId ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                  maxWidth: '70%',
                  alignSelf: msg.isCurrentUser ?? msg.senderId === currentUserId ? 'flex-end' : 'flex-start',
                  boxShadow:
                    msg.isCurrentUser ?? msg.senderId === currentUserId
                      ? '0 4px 15px rgba(79, 70, 229, 0.4)'
                      : '0 4px 15px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: msg.isCurrentUser ?? msg.senderId === currentUserId ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: (msg.isCurrentUser ?? msg.senderId === currentUserId) ? 'rgba(255, 255, 255, 0.8)' : '#d1d5db',
                    marginBottom: '0.3rem',
                    fontWeight: 'bold',
                  }}
                >
                  {msg.senderName}
                </div>
                <span style={{ wordBreak: 'break-word', lineHeight: '1.5' }}>{msg.text}</span>
                <div
                  style={{
                    fontSize: '0.8rem',
                    opacity: 0.6,
                    marginTop: '0.5rem',
                    textAlign: (msg.isCurrentUser ?? msg.senderId === currentUserId) ? 'right' : 'left',
                  }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              marginTop: 'auto',
              position: 'sticky',
              bottom: '0',
              background: 'rgba(30, 41, 59, 0.4)',
              padding: '0.5rem 0',
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
                padding: '1.2rem 1.8rem',
                borderRadius: '25px',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                fontSize: '1.2rem',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
                e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)';
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              style={{
                padding: '1.2rem 2.8rem',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6b21a8 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '25px',
                fontSize: '1.3rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 6px 20px rgba(79, 70, 229, 0.4)',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(79, 70, 229, 0.6)';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)';
              }}
            >
              <span>📤</span> Send
            </button>
          </div>
        </div>
      )}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1002,
          }}
        >
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              backdropFilter: 'blur(10px)',
              padding: '2rem',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              width: '400px',
              maxWidth: '90%',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h2 style={{ color: '#a855f7', marginBottom: '1.5rem', textAlign: 'center' }}>Create New Room</h2>
            <input
              type="text"
              placeholder="Room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                marginBottom: '1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                fontSize: '1.1rem',
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleCreateRoom}
                style={{
                  padding: '0.8rem 2rem',
                  background: 'linear-gradient(45deg, #34d399, #2ecc71)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(46, 204, 113, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '0.8rem 2rem',
                  background: '#ff6b6b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(255, 107, 107, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatrooms;