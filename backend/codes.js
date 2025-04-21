//BOOKS REALM@@
import React, { useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';

const BooksRealm = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particlesArray = [];
    const numberOfParticles = 120;

    for (let i = 0; i < numberOfParticles; i++) {
      particlesArray.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        size: Math.random() * 5 + 1,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      });
    }

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particlesArray.length; i++) {
        const p = particlesArray[i];
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = i; j < particlesArray.length; j++) {
          const p2 = particlesArray[j];
          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / 100})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.removeChild(canvas);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div>
      <button onClick={() => navigate('/home')}>Back to Home</button>
      <h1>Books Realm</h1>
      <nav>
        {[
          { path: 'browse', label: 'Browse Books' },
          { path: 'contribute', label: 'Contribute Books' },
          { path: 'requests', label: 'Book Requests' },
          { path: 'my-requests', label: 'My Requests' },
          { path: 'wishlist', label: 'Wishlist' },
        ].map(({ path, label }) => (
          <NavLink key={path} to={path}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div>
        <Outlet />
      </div>
    </div>
  );
};

export default BooksRealm;



//@BOOK REQUESTS@@
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BookRequests = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchRequests('');
  }, [navigate, token]);

  const fetchRequests = async (query) => {
    try {
      setIsLoading(true);
      setError(null);
      const url = query
        ? `http://localhost:5000/request/search?query=${encodeURIComponent(query)}`
        : `http://localhost:5000/request/all`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const fetchedRequests = data.requests || [];
        setRequests(
          fetchedRequests.map((req) => ({
            ...req,
            image: req.image || null,
            user: req.user || { _id: '', name: 'Unknown', email: 'Unknown', year: null },
          }))
        );
        if (fetchedRequests.length === 0) {
          setError(query ? 'No requests found for this query.' : 'No requests available in database.');
        }
      } else {
        let errorMessage = data.message || 'Failed to fetch requests';
        if (response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          localStorage.removeItem('token');
          navigate('/login');
        } else if (response.status === 500) {
          errorMessage = 'Server error: Please try again later.';
        } else if (response.status === 400) {
          errorMessage = 'Bad request: Check query parameters.';
        }
        setError(errorMessage);
        setRequests([]);
      }
    } catch (err) {
      const errorMessage = err.message.includes('Failed to fetch')
        ? 'Network error: Ensure backend is running at http://localhost:5000.'
        : 'Error fetching requests: ' + err.message;
      setError(errorMessage);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRequests(searchQuery);
  };

  const handleRequestClick = (req) => {
    setSelectedRequest(selectedRequest?._id === req._id ? null : req);
  };

  const handleChat = (email) => {
    navigate(`/chat?email=${encodeURIComponent(email)}`);
  };

  const closeModal = () => {
    setSelectedRequest(null);
  };

  return (
    <div>
      {error && (
        <div>
          <p>{error}</p>
          <button onClick={() => fetchRequests(searchQuery)}>Retry</button>
        </div>
      )}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search requests by title or author..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {isLoading ? (
        <p>Loading...</p>
      ) : requests.length > 0 ? (
        requests.map((req, index) => (
          <div key={`${req._id}-${req.type}-${index}`} onClick={() => handleRequestClick(req)}>
            {req.image ? (
              <img
                src={
                  req.image.startsWith('/files/')
                    ? `http://localhost:5000${req.image}`
                    : `http://localhost:5000/files/${req.image}`
                }
                alt={req.title}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/100x150?text=No+Image';
                }}
              />
            ) : (
              <div>No Image</div>
            )}
            <div>
              <h3>{req.title}</h3>
              <p>Author: {req.author || 'Unknown'}</p>
              <p>Type: {req.type}</p>
            </div>
            {selectedRequest && selectedRequest._id === req._id && (
              <div>
                <button onClick={closeModal}>X</button>
                {selectedRequest.user && (
                  <p>
                    Requester: {selectedRequest.user.name} ({selectedRequest.user.email})
                    {selectedRequest.user.year && `, Year: ${selectedRequest.user.year}`}
                  </p>
                )}
                <div>
                  <button onClick={() => handleChat(selectedRequest.user.email)}>Chat</button>
                </div>
              </div>
            )}
          </div>
        ))
      ) : (
        <p>No requests found.</p>
      )}
    </div>
  );
};

export default BookRequests;


//BROWSE BOOKS@@
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BrowseBooks = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const API_URL = 'http://localhost:5000';

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(String(decoded.userId));
    } catch (err) {
      console.error('Error decoding token:', err);
    }
    fetchItems('');
  }, [navigate, token]);

  const fetchItems = async (query) => {
    try {
      setIsLoading(true);
      setError(null);
      const url = query
        ? `${API_URL}/search?query=${encodeURIComponent(query)}`
        : `${API_URL}/search/all`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const books = data.books || [];
        const ebooks = data.ebooks || [];
        const allItems = [...books, ...ebooks];
        const filteredItems = allItems.filter((item) => {
          if (!item.uploader || !item.uploader._id) return true;
          return String(item.uploader._id) !== String(currentUserId);
        });
        const processedItems = filteredItems.map((item) => ({
          ...item,
          image: item.image || null,
          file: item.file || null,
          uploader: item.uploader || { _id: '', name: 'Unknown', email: 'Unknown', year: null },
          type: item.type || 'Physical Book',
        }));
        setItems(processedItems);
        if (processedItems.length === 0) {
          setError(query ? 'No books or E-Books found for this query.' : 'No books or E-Books available in database.');
        }
      } else {
        let errorMessage = data.message || 'Failed to fetch items';
        if (response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          localStorage.removeItem('token');
          navigate('/login');
        } else if (response.status === 500) {
          errorMessage = 'Server error: Please try again later.';
        } else if (response.status === 400) {
          errorMessage = 'Bad request: Check query parameters.';
        }
        setError(errorMessage);
        setItems([]);
      }
    } catch (err) {
      const errorMessage = err.message.includes('Failed to fetch')
        ? `Network error: Ensure backend is running at ${API_URL}.`
        : 'Error fetching items: ' + err.message;
      setError(errorMessage);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems(searchQuery);
  };

  const handleAddToWishlist = async (item) => {
    try {
      const response = await fetch(`${API_URL}/wishlist/add-by-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          _id: item._id,
          title: item.title,
          author: item.author || null,
          type: item.type,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert('Added to wishlist successfully!');
      } else {
        setError(data.message || 'Failed to add to wishlist.');
      }
    } catch (err) {
      setError('Error adding to wishlist.');
    }
  };

  const handleChatWithOwner = (email) => {
    if (!email) {
      setError('No owner email available.');
      return;
    }
    navigate(`/chat?email=${encodeURIComponent(email)}`);
  };

  const handleItemClick = (item) => {
    setSelectedItem(selectedItem?._id === item._id ? null : item);
  };

  const closeModal = () => {
    setSelectedItem(null);
  };

  return (
    <div>
      {error && (
        <div>
          <p>{error}</p>
          <button onClick={() => fetchItems(searchQuery)}>Retry</button>
        </div>
      )}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search books or E-Books..."
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {isLoading ? (
        <p>Loading...</p>
      ) : items.length > 0 ? (
        items.map((item, index) => (
          <div key={`${item._id}-${item.type}-${index}`} onClick={() => handleItemClick(item)}>
            {item.image ? (
              <img
                src={`${API_URL}${item.image}`}
                alt={item.title}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/100x150?text=No+Image';
                }}
              />
            ) : (
              <div>No Image</div>
            )}
            <div>
              <h3>{item.title}</h3>
              <p>Author: {item.author || 'Unknown'}</p>
              <p>Type: {item.type}</p>
              {item.type === 'E-Book' && item.file && (
                <div>
                  <a href={`${API_URL}${item.file}?view=false`} target="_blank" rel="noopener noreferrer">
                    Download
                  </a>
                </div>
              )}
            </div>
            {selectedItem?._id === item._id && (
              <div>
                <button onClick={(e) => { e.stopPropagation(); closeModal(); }}>X</button>
                {selectedItem.uploader && (
                  <p>
                    Owner: {selectedItem.uploader.name} ({selectedItem.uploader.email})
                    {selectedItem.uploader.year && `, Year: ${selectedItem.uploader.year}`}
                  </p>
                )}
                <div>
                  <button onClick={(e) => { e.stopPropagation(); handleChatWithOwner(selectedItem.uploader?.email || ''); }}>
                    Chat
                  </button>
                  {selectedItem.type === 'E-Book' && selectedItem.file && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/quiz', {
                          state: {
                            fileUrl: `${API_URL}${selectedItem.file}`,
                            fileName: selectedItem.title
                          }
                        });
                      }}
                    >
                      Attempt Quiz
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleAddToWishlist(selectedItem); }}>
                    Add to Wishlist
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      ) : (
        <p>No books or E-Books found.</p>
      )}
    </div>
  );
};

export default BrowseBooks;



//CONTRIBUTE BOOKS@@
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ContributeBooks = () => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState('Physical Book');
  const [file, setFile] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchUploads();
  }, [navigate, token]);

  const fetchUploads = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/upload/myUploads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUploads(
          data.uploads.map((upload) => ({
            ...upload,
            image: upload.image || null,
            file: upload.file || null,
          }))
        );
        if (data.uploads.length === 0) {
          setError('No uploads found for this user.');
        } else {
          setError(null);
        }
      } else {
        let errorMessage = data.message || 'Failed to fetch uploads';
        if (response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          localStorage.removeItem('token');
          navigate('/login');
        }
        setError(errorMessage);
        setUploads([]);
      }
    } catch (err) {
      setError('Network error: Ensure backend is running at http://localhost:5000.');
      setUploads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!title || !type) {
      setError('Title and type are required');
      return;
    }
    if (type === 'E-Book' && !file) {
      setError('File is required for E-Books');
      return;
    }
    const formData = new FormData();
    formData.append('title', title);
    if (author) formData.append('author', author);
    formData.append('type', type);
    if (file) formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUploads([...uploads, { ...data.book, image: data.book.image || null, file: data.book.file || null }]);
        setTitle('');
        setAuthor('');
        setFile(null);
        setError(null);
        alert(`${type} uploaded successfully!`);
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      setError('Network error: Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUpload = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/upload/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUploads(uploads.filter((upload) => upload._id !== id));
        alert('Upload deleted successfully');
        setError(null);
        fetchUploads();
      } else {
        let errorMessage = data.message || 'Failed to delete upload';
        if (response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          localStorage.removeItem('token');
          navigate('/login');
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError('Network error: Ensure backend is running.');
    }
  };

  return (
    <div>
      {error && <p>Error: {error}</p>}
      {isLoading && <p>Loading...</p>}
      <h2>Upload a Book or E-Book</h2>
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Author (optional)"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="Physical Book">Physical Book</option>
          <option value="E-Book">E-Book (PDF, Word, PPT)</option>
        </select>
        <input
          type="file"
          accept={type === 'Physical Book' ? 'image/*' : '.pdf,.doc,.docx,.ppt,.pptx'}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <p>
          {type === 'Physical Book'
            ? 'Upload an image (JPEG, PNG) for Physical Books (optional).'
            : 'Upload a readable file (PDF, Word, PPT) for E-Books (required).'}
        </p>
        <button onClick={handleUpload} disabled={isLoading}>
          {isLoading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      <h2>My Uploads</h2>
      {isLoading ? (
        <p>Loading uploads...</p>
      ) : uploads.length > 0 ? (
        uploads.map((upload) => (
          <div key={upload._id}>
            <div>
              {upload.image ? (
                <img
                  src={`http://localhost:5000${upload.image.startsWith('/files/') ? upload.image : `/files/${upload.image}`}`}
                  alt={upload.title}
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/100x150?text=No+Image';
                  }}
                />
              ) : (
                <div>No Image</div>
              )}
              <div>
                <h3>{upload.title}</h3>
                <p>Author: {upload.author || 'Unknown'}</p>
                <p>Type: {upload.type}</p>
                {upload.file && (
                  <a href={`http://localhost:5000${upload.file}`} target="_blank" rel="noopener noreferrer">
                    Download
                  </a>
                )}
              </div>
            </div>
            <button onClick={() => handleDeleteUpload(upload._id)}>Delete</button>
          </div>
        ))
      ) : (
        <p>You haven't uploaded anything yet.</p>
      )}
    </div>
  );
};

export default ContributeBooks;



//REQUETS BOOKS@@
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MyRequests = () => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState('Physical/E-Book');
  const [file, setFile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchRequests();
  }, [navigate, token]);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/request/mine', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRequests(
          data.requests.map((req) => ({
            ...req,
            image: req.image || null,
          }))
        );
        if (data.requests.length === 0) {
          setError('No requests found for this user.');
        } else {
          setError(null);
        }
      } else {
        let errorMessage = data.message || 'Failed to fetch requests';
        if (response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          localStorage.removeItem('token');
          navigate('/login');
        }
        setError(errorMessage);
        setRequests([]);
      }
    } catch (err) {
      setError('Network error: Ensure backend is running at http://localhost:5000.');
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!title) {
      setError('Title is required');
      return;
    }
    const formData = new FormData();
    formData.append('title', title);
    if (author) formData.append('author', author);
    formData.append('type', type);
    if (file) formData.append('image', file);

    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/request/add', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRequests([...requests, { ...data.request, image: data.request.image || null }]);
        setTitle('');
        setAuthor('');
        setType('Physical/E-Book');
        setFile(null);
        setError(null);
        alert('Request posted successfully!');
      } else {
        let errorMessage = data.message || 'Failed to post request';
        if (response.status === 404) {
          errorMessage = 'Backend route not found. Please ensure the server is configured correctly.';
        } else if (response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          localStorage.removeItem('token');
          navigate('/login');
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError('Network error: Ensure backend is running at http://localhost:5000.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRequest = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/request/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRequests(requests.filter((req) => req._id !== id));
        alert('Request deleted successfully');
        setError(null);
        fetchRequests();
      } else {
        let errorMessage = data.message || 'Failed to delete request';
        if (response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          localStorage.removeItem('token');
          navigate('/login');
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError('Network error: Ensure backend is running.');
    }
  };

  return (
    <div>
      {error && <p>Error: {error}</p>}
      {isLoading && <p>Loading...</p>}
      <h2>Request a Book</h2>
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Author (optional)"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="Physical Book">Physical Book</option>
          <option value="E-Book">E-Book</option>
          <option value="Physical/E-Book">Physical/E-Book</option>
        </select>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <p>Upload an image (JPEG, PNG) for the request (optional).</p>
        <button onClick={handleRequest} disabled={isLoading}>
          {isLoading ? 'Requesting...' : 'Request'}
        </button>
      </div>
      <h2>My Requests</h2>
      {isLoading ? (
        <p>Loading requests...</p>
      ) : requests.length > 0 ? (
        requests.map((req) => (
          <div key={req._id}>
            {req.image ? (
              <img
                src={`http://localhost:5000${req.image.startsWith('/files/') ? req.image : `/files/${req.image}`}`}
                alt={req.title}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/100x150?text=No+Image';
                }}
              />
            ) : (
              <div>No Image</div>
            )}
            <div>
              <h3>{req.title}</h3>
              <p>Author: {req.author || 'Unknown'}</p>
              <p>Type: {req.type}</p>
            </div>
            <button onClick={() => handleDeleteRequest(req._id)}>Delete</button>
          </div>
        ))
      ) : (
        <p>No requests found</p>
      )}
    </div>
  );
};

export default MyRequests;


//WISHLIST.TSX@@
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const API_URL = 'http://localhost:5000';

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchWishlist();
  }, [navigate, token]);

  const fetchWishlist = async () => {
    try {
      const response = await fetch(`${API_URL}/wishlist/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setWishlist(data.items || []);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch wishlist');
      }
    } catch (err) {
      setError('Error fetching wishlist');
    }
  };

  const handleRemoveFromWishlist = async (bookId) => {
    try {
      const response = await fetch(`${API_URL}/wishlist/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookId }),
      });
      const data = await response.json();
      if (response.ok) {
        setWishlist(wishlist.filter((item) => item.bookId !== bookId));
        setSelectedItem(null);
        alert('Removed from wishlist');
      } else {
        setError(data.message || 'Failed to remove from wishlist');
      }
    } catch (err) {
      setError('Error removing from wishlist');
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(selectedItem?.bookId === item.bookId ? null : item);
  };

  const closeModal = () => {
    setSelectedItem(null);
  };

  const handleDownloadEbook = (fileUrl) => {
    window.open(`${API_URL}${fileUrl}?view=false`, '_blank');
  };

  const handleChat = () => {
    if (selectedItem?.uploader?.email && selectedItem.uploader.name) {
      const email = encodeURIComponent(selectedItem.uploader.email);
      const name = encodeURIComponent(selectedItem.uploader.name);
      navigate(`/chat?email=${email}&name=${name}`);
    } else {
      alert('Uploader info not available');
    }
  };

  return (
    <div>
      {error && <p>Error: {error}</p>}
      <h2>My Wishlist</h2>
      {wishlist.length > 0 ? (
        wishlist.map((item, index) => (
          <div key={`${item.bookId}-${item.type}-${index}`} onClick={() => handleItemClick(item)}>
            {item.image ? (
              <img
                src={`${API_URL}${item.image}`}
                alt={item.title}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/100x150?text=No+Image';
                }}
              />
            ) : (
              <div>No Image</div>
            )}
            <div>
              <h3>{item.title}</h3>
              <p>Author: {item.author || 'Unknown'}</p>
              <p>Type: {item.type}</p>
              {item.type === 'E-Book' && item.file && (
                <button onClick={(e) => { e.stopPropagation(); handleDownloadEbook(item.file); }}>
                  Download E-Book
                </button>
              )}
            </div>
            {selectedItem?.bookId === item.bookId && (
              <div>
                <button onClick={(e) => { e.stopPropagation(); closeModal(); }}>X</button>
                <p>
                  Owner: {selectedItem.uploader?.name || 'Unknown'} (
                  {selectedItem.uploader?.email || 'Unknown'})
                  {selectedItem.uploader?.year && `, Year: ${selectedItem.uploader.year}`}
                </p>
                <div>
                  <button onClick={(e) => { e.stopPropagation(); handleChat(); }}>
                    Chat
                  </button>
                  {selectedItem.type === 'E-Book' && selectedItem.file && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/quiz', {
                          state: {
                            fileUrl: `${API_URL}${selectedItem.file}`,
                            fileName: selectedItem.title
                          }
                        });
                      }}
                    >
                      Attempt Quiz
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveFromWishlist(selectedItem.bookId); }}>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      ) : (
        <p>Wishlist is empty</p>
      )}
    </div>
  );
};

export default Wishlist;


//CHAT.TSX@@
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

declare global {
  interface WebSocket {
    intentionalClose?: boolean;
  }
}

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [receiverId, setReceiverId] = useState(null);
  const [receiverName, setReceiverName] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchUsers, setSearchUsers] = useState([]);
  const [chatPartners, setChatPartners] = useState([]);
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [shouldScrollToLatest, setShouldScrollToLatest] = useState(false);
  const ws = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const reconnectTimeout = useRef(null);
  const hasLoadedHistory = useRef({});
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const token = localStorage.getItem('token');
  const currentUserId = token ? JSON.parse(atob(token.split('.')[1])).userId : null;

  const fetchChatPartners = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/chat/chat-partners', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        const filteredPartners = data.partners
          .filter((partner) => partner._id !== currentUserId)
          .sort((a, b) => new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp));
        setChatPartners(filteredPartners);
      } else {
        setError(data.message || 'Failed to load chat partners');
      }
    } catch (err) {
      setError('Failed to load chat partners');
    }
  };

  const fetchFriends = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/friends/list', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.friends) {
        setFriends(data.friends);
        setError(null);
      } else {
        setError(data.message || 'Failed to load friends');
      }
    } catch (err) {
      setError('Failed to load friends');
    }
  };

  const connectWebSocket = async (newReceiverId, newReceiverName) => {
    if (!newReceiverId || !currentUserId || !token) {
      navigate('/login');
      return;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    setIsLoading(true);
    setError(null);

    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.intentionalClose = true;
      ws.current.close(1000, 'Switching chat');
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    ws.current = new WebSocket('ws://localhost:5000/chat/ws', ['chat']);
    ws.current.intentionalClose = false;

    ws.current.onopen = () => {
      setIsLoading(false);
      setError(null);
      setReceiverId(newReceiverId);
      setReceiverName(newReceiverName);
      ws.current.send(JSON.stringify({ type: 'auth', token, receiverId: newReceiverId }));
      setShouldScrollToLatest(true);
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'auth' && message.error) {
        setError(message.error);
        ws.current?.close();
      } else if (message.text) {
        const isForCurrentChat =
          (message.receiverId === newReceiverId && message.senderId === currentUserId) ||
          (message.senderId === newReceiverId && message.receiverId === currentUserId);

        if (isForCurrentChat) {
          setMessages((prev) => {
            if (prev.find((m) => m.timestamp === message.timestamp && m.senderId === message.senderId)) {
              return prev;
            }
            return [...prev, { ...message, senderName: message.senderName || 'Unknown' }]
              .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          });
          setShouldScrollToLatest(true);
        }

        if (!chatPartners.some(p => p._id === message.senderId) && message.senderId !== currentUserId) {
          setTimeout(fetchChatPartners, 100);
        }
      }
    };

    ws.current.onerror = () => {
      setIsLoading(false);
      setError('Connection error. Attempting to reconnect...');
    };

    ws.current.onclose = (event) => {
      if (!ws.current?.intentionalClose) {
        setError('Connection lost. Reconnecting...');
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket(newReceiverId, newReceiverName);
        }, 5000);
      }
    };

    if (newReceiverId) {
      await loadHistory(newReceiverId, !hasLoadedHistory.current[newReceiverId]);
      hasLoadedHistory.current[newReceiverId] = true;
    }
  };

  const loadHistory = async (receiverId, forceReload = false) => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (!forceReload && hasLoadedHistory.current[receiverId] && !location.search.includes('email=')) return;

    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:5000/chat/messages/${receiverId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        const messagesWithNames = await Promise.all(
          data.messages.map(async (msg) => {
            let senderName = msg.sender === currentUserId ? 'You' : 'Unknown';
            const partner = chatPartners.find(p => p._id === msg.sender) || friends.find(f => f._id === msg.sender);
            if (partner) senderName = partner.name;
            else if (msg.sender !== currentUserId) {
              try {
                const userResponse = await fetch(`http://localhost:5000/profile/${msg.sender}`, {
                  headers: { 'Authorization': `Bearer ${token}` },
                });
                const userData = await userResponse.json();
                if (userData.success) senderName = userData.profile.name;
              } catch (err) {}
            }
            return { ...msg, senderId: msg.sender, receiverId: msg.receiver, senderName };
          })
        );
        setMessages(messagesWithNames.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        hasLoadedHistory.current[receiverId] = true;
        setShouldScrollToLatest(true);
      } else {
        setError(data.message || 'Failed to load history');
      }
    } catch (err) {
      setError('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchChatPartners();
      await fetchFriends();
      const params = new URLSearchParams(location.search);
      const userId = params.get('userId');
      const name = params.get('name');
      const email = params.get('email');

      if (userId && name && userId !== currentUserId) {
        handleSelectUser(userId, decodeURIComponent(name));
      } else if (email && token) {
        try {
          const response = await fetch(`http://localhost:5000/chat/search-users?query=${encodeURIComponent(email)}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const data = await response.json();
          if (data.success && data.users.length === 1) {
            const user = data.users[0];
            delete hasLoadedHistory.current[user._id];
            handleSelectUser(user._id, user.name);
          } else {
            setError('User not found for this email.');
          }
        } catch (err) {
          setError('Failed to search user by email.');
        }
      }
    };

    fetchInitialData();

    return () => {
      if (ws.current) ws.current.close(1000, 'Component unmount');
    };
  }, [navigate, token, location]);

  const handleSearch = async () => {
    if (!searchQuery) {
      setSearchUsers([]);
      return;
    }
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/chat/search-users?query=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.users.length > 0) {
        setSearchUsers(data.users);
      } else {
        setError(data.message || 'Search failed');
      }
    } catch (err) {
      setError('Failed to search users');
    }
  };

  const handleSelectUser = async (userId, name) => {
    if (receiverId === userId) {
      scrollToLatestMessage();
      return;
    }

    setMessages([]);
    await connectWebSocket(userId, name);

    setChatPartners(prev => {
      if (prev.some(p => p._id === userId)) {
        return prev.map(p => p._id === userId ? { ...p, name } : p);
      }
      return [
        { _id: userId, name, email: '', lastMessageTimestamp: new Date().toISOString() },
        ...prev
      ];
    });

    hasLoadedHistory.current[userId] = false;
    setShouldScrollToLatest(true);
  };

  const handleChatWithUser = (userId, name) => {
    handleSelectUser(userId, name);
    setSearchQuery('');
    setSearchUsers([]);
  };

  const handleAddFriend = async (friendId) => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/friends/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });
      const data = await response.json();
      if (data.message.includes('added')) {
        const friend = searchUsers.find(u => u._id === friendId);
        if (friend) setFriends([...friends, friend]);
        setSearchUsers(searchUsers.filter(u => u._id !== friendId));
        await fetchFriends();
      } else if (data.message.includes('removed')) {
        setFriends(friends.filter(f => f._id !== friendId));
        await fetchFriends();
      } else {
        setError(data.message || 'Failed to toggle friend');
      }
    } catch (err) {
      setError('Failed to toggle friend');
    }
  };

  const handleSendMessage = () => {
    if (!currentUserId || !receiverId || !newMessage.trim() || !token) {
      setError('Please select a receiver and enter a message.');
      return;
    }
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const messageData = {
        senderId: currentUserId,
        receiverId,
        text: newMessage,
        timestamp: new Date().toISOString(),
      };
      ws.current.send(JSON.stringify(messageData));
      setNewMessage('');
      setError(null);
      setShouldScrollToLatest(true);
    } else {
      setError('WebSocket connection not open.');
    }
  };

  const handleShowFriends = () => setShowFriends(true);
  const handleCloseFriends = () => setShowFriends(false);

  const handleChatFromFriend = (friendId, name) => {
    handleSelectUser(friendId, name);
    setShowFriends(false);
  };

  const handleRemoveFriend = async (friendId) => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/friends/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });
      const data = await response.json();
      if (data.message.includes('removed')) {
        setFriends(friends.filter(f => f._id !== friendId));
        await fetchFriends();
      } else {
        setError(data.message || 'Failed to remove friend');
      }
    } catch (err) {
      setError('Failed to remove friend');
    }
  };

  const scrollToLatestMessage = () => {
    if (messagesEndRef.current) {
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
    <div>
      <button onClick={() => {
        if (ws.current) ws.current.close(1000, 'Navigating home');
        navigate('/home');
      }}>
        Back to Home
      </button>
      {error && <p>Error: {error}</p>}
      <div>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>Search</button>
        {(searchQuery && searchUsers.length > 0) ? (
          searchUsers.map((user) => (
            <div key={user._id}>
              <span>{user.name}</span>
              <button onClick={() => handleChatWithUser(user._id, user.name)}>Chat</button>
              {!friends.some((f) => f._id === user._id) && (
                <button onClick={() => handleAddFriend(user._id)}>Add Friend</button>
              )}
            </div>
          ))
        ) : (
          chatPartners.map((user) => (
            <div key={user._id} onClick={() => handleSelectUser(user._id, user.name)}>
              {user.name}
            </div>
          ))
        )}
        <button onClick={handleShowFriends}>Friends</button>
      </div>
      {receiverId && (
        <div>
          <div>
            <h1>Chat</h1>
            {receiverName && (
              <div>
                <span>{receiverName}</span>
                <button onClick={() => friends.some(f => f._id === receiverId) ? handleRemoveFriend(receiverId) : handleAddFriend(receiverId)}>
                  {friends.some(f => f._id === receiverId) ? 'Remove Friend' : 'Add Friend'}
                </button>
              </div>
            )}
          </div>
          {isLoading && <p>Loading...</p>}
          <div ref={messagesContainerRef}>
            {messages.map((msg, index) => (
              <div key={index}>
                <div>{msg.senderName || 'Unknown'}</div>
                <span>{msg.text}</span>
                <div>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
      {showFriends && (
        <div>
          <button onClick={handleCloseFriends}>Close</button>
          {friends.map((friend) => (
            <div key={friend._id}>
              <span>{friend.name}</span>
              <button onClick={() => handleChatFromFriend(friend._id, friend.name)}>Chat</button>
              <button onClick={() => handleRemoveFriend(friend._id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Chat;



//CHATROOMS.TSX@@
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Chatrooms = () => {
  const [myRooms, setMyRooms] = useState([]);
  const [createdRooms, setCreatedRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shouldScrollToLatest, setShouldScrollToLatest] = useState(false);
  const ws = useRef(null);
  const navigate = useNavigate();
  const reconnectTimeout = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const token = localStorage.getItem('token');
  const currentUserId = token ? JSON.parse(atob(token.split('.')[1])).userId : null;
  const currentUsername = token ? JSON.parse(atob(token.split('.')[1])).username : null;

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
      setError('Failed to load created rooms');
    }
  };

  const connectWebSocket = async (roomId) => {
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
      setError(null);
      setIsLoading(false);
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'auth', token, roomId }));
      }
      setShouldScrollToLatest(true);
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
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
              const newMessage = { ...message, senderName: message.senderName || 'Unknown' };
              const updatedMessages = [...prev, newMessage].sort(
                (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
              );
              setShouldScrollToLatest(true);
              return updatedMessages;
            }
            return prev;
          });
        }
      } catch (err) {
        setError('Failed to process message');
      }
    };

    ws.current.onerror = () => {
      setError('Connection error. Attempting to reconnect...');
      setIsLoading(false);
    };

    ws.current.onclose = () => {
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
        setMessages(data.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        setShouldScrollToLatest(true);
      } else if (data.message) {
        setError(data.message);
      }
    } catch (err) {
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
      setError('Failed to search rooms');
    }
  };

  const handleJoinRoom = async (roomId) => {
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
      setError('Failed to join room');
    }
  };

  const handleLeaveRoom = async (roomId) => {
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
      setError('Failed to leave room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
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
      setError('Failed to delete room');
    }
  };

  const handleSelectRoom = (room) => {
    if (selectedRoom?._id !== room._id) {
      setSelectedRoom(room);
      setError(null);
      setMessages([]);
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
    if (messagesEndRef.current) {
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
    <div>
      <button onClick={() => {
        if (ws.current) ws.current.close(1000, 'Navigating home');
        navigate('/home');
      }}>
        Back to Home
      </button>
      <div>
        {error && <p>Error: {error}</p>}
        <div>
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
          />
          <button onClick={handleSearchRooms}>Search</button>
        </div>
        <div>
          {(searchResults.length > 0 ? searchResults : myRooms).map((room) => {
            const isMember = myRooms.some(r => r._id === room._id);
            return (
              <div key={room._id} onClick={() => isMember && handleSelectRoom(room)}>
                <span>{room.name}{createdRooms.some(r => r._id === room._id) ? ' (Admin)' : ''}</span>
                {!isMember && searchResults.length > 0 && (
                  <button onClick={() => handleJoinRoom(room._id)}>Join</button>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={() => setShowCreateModal(true)}>Create Room</button>
      </div>
      {selectedRoom && (
        <div>
          <div>
            <h1>Chat</h1>
            <div>
              <span>{selectedRoom.name}</span>
              <button onClick={() => handleLeaveRoom(selectedRoom._id)}>
                {createdRooms.some(r => r._id === selectedRoom._id) ? 'Leave' : 'Leave'}
              </button>
              {createdRooms.some(r => r._id === selectedRoom._id) && (
                <button onClick={() => handleDeleteRoom(selectedRoom._id)}>Delete</button>
              )}
            </div>
          </div>
          {isLoading && <p>Loading...</p>}
          <div ref={messagesContainerRef}>
            {messages.map((msg, index) => (
              <div key={index}>
                <div>{msg.senderName || 'Unknown'}</div>
                <span>{msg.text}</span>
                <div>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
      {showCreateModal && (
        <div>
          <div>
            <h2>Create New Room</h2>
            <input
              type="text"
              placeholder="Room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
            />
            <div>
              <button onClick={handleCreateRoom}>Create</button>
              <button onClick={() => setShowCreateModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatrooms;


//QUIZ.TSX@@
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Quiz = () => {
  const [quizData, setQuizData] = useState([]);
  const [rawQuizData, setRawQuizData] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [file, setFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [quizMode, setQuizMode] = useState('setup');
  const [userAnswers, setUserAnswers] = useState([]);
  const token = localStorage.getItem('token');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFileFromUrl = async () => {
      if (location.state?.fileUrl && location.state?.fileName) {
        try {
          setIsGenerating(true);
          setErrorMessage('');
          
          const response = await fetch(location.state.fileUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!response.ok) throw new Error('Failed to fetch file');
          
          const blob = await response.blob();
          const fileFromBlob = new File([blob], location.state.fileName, { type: blob.type });
          setFile(fileFromBlob);
          
          const formData = new FormData();
          formData.append('file', fileFromBlob);
          
          const quizResponse = await fetch('http://localhost:5000/quiz', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          const quizData = await quizResponse.json();
          if (quizResponse.ok) {
            if (quizData.questions?.length > 0) {
              setQuizData(quizData.questions);
              setUserAnswers(new Array(quizData.questions.length).fill(null));
              setQuizMode('exam');
            } else if (quizData.rawQuiz) {
              setRawQuizData(quizData.rawQuiz);
              setQuizData([]);
              setErrorMessage('Quiz generated in raw format. The AI response was not properly structured.');
            } else {
              setErrorMessage('Unexpected response format from server');
            }
          } else {
            setErrorMessage(quizData.message || 'Failed to generate quiz');
          }
        } catch (err) {
          setErrorMessage('Error fetching or processing the file. Please try uploading manually.');
        } finally {
          setIsGenerating(false);
        }
      }
    };
    
    fetchFileFromUrl();
  }, [location.state, token]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setQuizData([]);
      setRawQuizData('');
      setErrorMessage('');
      setQuizMode('setup');
    }
  };

  const handleGenerateQuiz = async () => {
    if (!file) {
      setErrorMessage('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsGenerating(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://localhost:5000/quiz', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        if (data.questions?.length > 0) {
          setQuizData(data.questions);
          setUserAnswers(new Array(data.questions.length).fill(null));
          setQuizMode('exam');
        } else if (data.rawQuiz) {
          setRawQuizData(data.rawQuiz);
          setQuizData([]);
          setErrorMessage('Quiz generated in raw format. The AI response was not properly structured.');
        } else {
          setErrorMessage('Unexpected response format from server');
        }
      } else {
        setErrorMessage(data.message || 'Failed to generate quiz');
      }
    } catch (err) {
      setErrorMessage('Error connecting to server. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (questionIndex, choice) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = choice;
    setUserAnswers(newAnswers);
  };

  const submitQuiz = () => {
    setQuizMode('results');
    let correctCount = 0;
    quizData.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) correctCount++;
    });
    const results = { questions: quizData, userAnswers, score: correctCount };
    localStorage.setItem('lastQuizResults', JSON.stringify(results));
    scrollToFirstQuestion();
  };

  const resetQuiz = () => {
    setQuizMode('setup');
    setUserAnswers(new Array(quizData.length).fill(null));
    handleGenerateQuiz();
  };

  const newQuiz = () => {
    setQuizMode('setup');
    setFile(null);
    setQuizData([]);
    setRawQuizData('');
    setUserAnswers([]);
  };

  const scrollToFirstQuestion = () => {
    const firstQuestion = document.getElementById('question-0');
    if (firstQuestion) firstQuestion.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderAllQuestions = () => {
    if (!quizData.length) return null;
    
    return (
      <div>
        {quizData.map((question, questionIndex) => (
          <div key={questionIndex} id={`question-${questionIndex}`}>
            <div>
              <h3>Question {questionIndex + 1} of {quizData.length}</h3>
            </div>
            <p>{question.question}</p>
            <div>
              {question.choices.map((choice, choiceIndex) => (
                <div 
                  key={choiceIndex}
                  onClick={() => handleAnswerSelect(questionIndex, choice)}
                >
                  <label>
                    <input 
                      type="radio" 
                      name={`question-${questionIndex}`}
                      checked={userAnswers[questionIndex] === choice}
                      onChange={() => handleAnswerSelect(questionIndex, choice)}
                    />
                    <span>{choice}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div>
          <button onClick={submitQuiz}>Submit Quiz</button>
        </div>
      </div>
    );
  };

  const renderResultsScreen = () => {
    let score = 0;
    quizData.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) score++;
    });
    const percentage = Math.round((score / quizData.length) * 100);
    
    return (
      <div>
        <h3>Quiz Results</h3>
        <div>
          <div>{score} / {quizData.length}</div>
          <div>{percentage}%</div>
        </div>
        <div>
          {quizData.map((question, qIndex) => {
            const isCorrect = userAnswers[qIndex] === question.correctAnswer;
            const userAnswer = userAnswers[qIndex];
            const isUnattempted = userAnswer === null;

            return (
              <div key={qIndex} id={`question-${qIndex}`}>
                <div>
                  <span>{isUnattempted ? '' : isCorrect ? '✓' : '✗'}</span>
                  <h4>{qIndex + 1}. {question.question}</h4>
                </div>
                <div>
                  {question.choices.map((choice, cIndex) => (
                    <div key={cIndex}>
                      <div>
                        {userAnswer === choice && <span>Selected</span>}
                        {choice === question.correctAnswer && <span>Correct</span>}
                        <span>{choice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <button onClick={resetQuiz}>Generate Again</button>
          <button onClick={newQuiz}>New Quiz</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <button onClick={() => navigate('/home')}>Back to Home</button>
      <div>
        <h2>Quiz Arena</h2>
      </div>
      <div>
        {quizMode === 'setup' && (
          <div>
            <h1>"Sharpen your minds, Attempt the Quiz!"</h1>
            <div>
              <input 
                type="file" 
                accept=".txt,.pdf,.doc,.docx,.ppt,.pptx" 
                onChange={handleFileChange}
                id="file-upload"
              />
              <label htmlFor="file-upload">{file ? 'Click below to generate' : 'Choose a File'}</label>
              <button 
                onClick={handleGenerateQuiz}
                disabled={!file || isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Quiz'}
              </button>
              {isGenerating && <p>Generating quiz from your document...</p>}
            </div>
          </div>
        )}
        {errorMessage && <div>{errorMessage}</div>}
        {isGenerating && <div>Loading...</div>}
        {quizMode === 'exam' && <div>{renderAllQuestions()}</div>}
        {quizMode === 'results' && <div>{renderResultsScreen()}</div>}
        {!quizData.length && rawQuizData && (
          <div>
            <h3>Raw Quiz Data</h3>
            <p>The AI generated a response that couldn't be formatted as a quiz. Here's the raw output:</p>
            <pre>{rawQuizData}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;


//Home@@
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [username, setUsername] = useState(null);
  const [user, setUser] = useState({ name: '', email: '', phone: '', year: '' });
  const [editedUser, setEditedUser] = useState({ name: '', email: '', phone: '', year: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://localhost:5000/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Profile fetch failed');
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          setUsername(data.profile.name);
          setUser(data.profile);
          setEditedUser(data.profile);
        } else {
          throw new Error(data.message || 'Profile fetch failed');
        }
      })
      .catch((err) => {
        if (err.message.includes('401')) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      });
  }, [navigate]);

  const handleChange = (e) => {
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
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Update failed');
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          setUser((prev) => ({ ...prev, ...updateData }));
          setUsername(updateData.name);
          alert('Profile updated successfully!');
        } else {
          throw new Error(data.message || 'Update failed');
        }
      })
      .catch((err) => {
        setError(`Failed to update profile: ${err.message}`);
      })
      .finally(() => {
        setIsLoading(false);
        setShowPopup(false);
        setShowSidebar(true);
      });
  };

  const handleCancel = () => {
    setEditedUser(user);
    setError(null);
    setShowPopup(false);
    setShowSidebar(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleProfileClick = () => {
    setShowSidebar(true);
  };

  if (!localStorage.getItem('token')) {
    return null;
  }

  return (
    <div>
      <div>
        <div>
          <button onClick={handleProfileClick}>Profile</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div>
        <div>
          <h2>Welcome, {username || 'User'}!</h2>
          <h3>EduConnect</h3>
          <p>"Connecting Students Through Sharing and Learning."</p>
          <p>Discover books, connect with peers, join chatrooms, and challenge yourself with quizzes!</p>
        </div>

        <div>
          <div onClick={() => handleNavigation('/books')}>
            <h3>Books Realm</h3>
            <p>Explore and share books</p>
          </div>
          <div onClick={() => handleNavigation('/chat')}>
            <h3>Connect Hub</h3>
            <p>Chat with peers</p>
          </div>
          <div onClick={() => handleNavigation('/chatrooms')}>
            <h3>Community</h3>
            <p>Join group discussions</p>
          </div>
          <div onClick={() => handleNavigation('/quiz')}>
            <h3>Quiz</h3>
            <p>Test your knowledge</p>
          </div>
        </div>
      </div>

      {showSidebar && (
        <div>
          <div>
            <h3>Your Profile</h3>
            <button onClick={() => setShowSidebar(false)}>✕</button>
          </div>
          <div>
            <div>
              <h4>{username || 'User'}</h4>
              <p>{user.email}</p>
            </div>
            <div>
              <label>Name</label>
              <p>{user.name}</p>
            </div>
            <div>
              <label>Phone</label>
              <p>{user.phone || 'Not provided'}</p>
            </div>
            <div>
              <label>Year</label>
              <p>{user.year || 'Not provided'}</p>
            </div>
          </div>
          <button onClick={() => setShowPopup(true)}>Update Profile</button>
        </div>
      )}

      {showPopup && (
        <div onClick={() => setShowPopup(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <div>
              <h3>Update Profile</h3>
              <button onClick={() => setShowPopup(false)}>✕</button>
            </div>
            {error && <div>{error}</div>}
            <div>
              <div>
                <label>Name</label>
                <input type="text" name="name" value={editedUser.name} onChange={handleChange} />
              </div>
              <div>
                <label>Phone</label>
                <input type="text" name="phone" value={editedUser.phone} onChange={handleChange} />
              </div>
              <div>
                <label>Year</label>
                <input type="text" name="year" value={editedUser.year} onChange={handleChange} />
              </div>
            </div>
            <div>
              <button onClick={handleCancel}>Cancel</button>
              <button onClick={handleUpdate} disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;


//login@@
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/home');
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      localStorage.setItem('token', data.token);
      navigate('/home');
    } catch (error) {
      setError(error.message || 'Connection issue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e, nextField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextField) {
        nextField.focus();
      } else {
        handleLogin();
      }
    }
  };

  return (
    <div>
      <div>
        <h2>Edu-Connect</h2>
        <p>Connect, Share, learn, and grow together</p>

        {error && <div>{error}</div>}

        <div>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, document.querySelector('input[type="password"]'))}
              placeholder="Email Address"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e)}
              placeholder="Password"
            />
          </div>
        </div>

        <button onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Sign In'}
        </button>

        <div>
          <p>
            Don't have an account?{' '}
            <span onClick={() => navigate('/signup')}>Sign Up</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

//signup.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const yearRef = useRef(null);

  const handleSignup = async () => {
    if (!name || !email || !password || !phone || !year) {
      setError('All fields are required.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:5000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, year }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Signup failed. Please try again.');
      }

      if (data.success) {
        localStorage.setItem('token', data.token);
        navigate('/home');
      } else {
        setError(data.message || 'Signup failed. Try again.');
      }
    } catch (error) {
      setError(error.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e, nextField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextField) {
        nextField.focus();
      } else {
        handleSignup();
      }
    }
  };

  return (
    <div>
      <div>
        <div>
          <h2>Edu-Connect</h2>
          <p>Join the ultimate student community</p>

          {error && <div>{error}</div>}

          <div>
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, document.querySelector('input[type="email"]'))}
                placeholder="Full Name"
              />
            </div>
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, document.querySelector('input[type="password"]'))}
                placeholder="Email Address"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, document.querySelector('input[type="tel"]'))}
                placeholder="Password"
              />
            </div>
            <div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, yearRef.current)}
                placeholder="Phone Number"
              />
            </div>
            <div>
              <input
                ref={yearRef}
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e)}
                placeholder="Year in College"
              />
            </div>
          </div>

          <button onClick={handleSignup} disabled={isLoading}>
            {isLoading ? 'Signing Up...' : 'Create Account'}
          </button>

          <div>
            <p>
              Already have an account? <span onClick={() => navigate('/')}>Login</span>
            </p>
          </div>
        </div>

        <div>
          <h3>Welcome to Edu-Connect</h3>
          <p>
            Edu-Connect is your all-in-one platform for university students. Share or donate books,
            browse e-books and physical copies, and create quizzes to test your knowledge. Connect
            with peers through chat, join community lounges for discussions, and manage your wishlist
            and book requests effortlessly.
          </p>
          <ul>
            <li>Share & discover books</li>
            <li>Connect with friends</li>
            <li>Attempt quizzes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Signup;


//@@@server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { GridFSBucket, ObjectId } = require('mongodb');
const authMiddleware = require('./middleware/authMiddleware');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const profileRoutes = require('./routes/profile');
const searchRoutes = require('./routes/search');
const requestRoutes = require('./routes/request');
const wishlistRoutes = require('./routes/wishlist');
const friendRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');
const chatRoomRoutes = require('./routes/chatRoom');
const quizRoutes = require('./routes/quiz');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/chat/ws' });

mongoose.set('strictQuery', false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use('/uploads', express.static('uploads'));

let gfs;
mongoose.connection.once('open', () => {
  gfs = new GridFSBucket(mongoose.connection.db, { bucketName: 'files' });
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Server is running!' });
});

app.use('/auth', authRoutes);
app.use('/wishlist', authMiddleware, wishlistRoutes);
app.use('/upload', authMiddleware, uploadRoutes);
app.use('/profile', authMiddleware, profileRoutes);
app.use('/search', authMiddleware, searchRoutes);
app.use('/request', authMiddleware, requestRoutes);
app.use('/friends', authMiddleware, friendRoutes);
app.use('/chat', authMiddleware, chatRoutes);
app.use('/chatrooms', authMiddleware, chatRoomRoutes);
app.use('/quiz', quizRoutes);

app.get('/files/:id', async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const files = await gfs.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    const file = files[0];
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', file.contentType.startsWith('image') ? 'inline' : 'attachment');
    gfs.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error streaming file', error: error.message });
  }
});

app.get('/files/stream/:id', async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const files = await gfs.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    const file = files[0];
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    const disposition = req.query.view !== 'false' ? 'inline' : 'attachment';
    res.set('Content-Disposition', `${disposition}; filename="${file.filename}"`);
    gfs.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error streaming file', error: error.message });
  }
});

wss.on('connection', (ws, req) => {
  let authenticated = false;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'auth') {
        const { verify } = require('jsonwebtoken');
        try {
          const decoded = verify(data.token, process.env.JWT_SECRET);
          const User = require('./models/User');
          const user = await User.findById(decoded.userId).select('name email year');
          if (!user) {
            ws.send(JSON.stringify({ type: 'auth', error: 'Unauthorized' }));
            ws.close(1008);
            return;
          }
          ws.userId = decoded.userId;
          ws.username = user.name || 'Unknown';
          authenticated = true;
          if (data.roomId) ws.roomId = data.roomId;
          if (data.receiverId) ws.receiverId = data.receiverId;
          ws.send(JSON.stringify({ type: 'auth', success: true, receiverId: data.receiverId, roomId: data.roomId }));
        } catch (err) {
          ws.send(JSON.stringify({ type: 'auth', error: 'Invalid token' }));
          ws.close(1008);
          return;
        }
        return;
      }

      if (!authenticated) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        return;
      }

      if (data.receiverId && data.text) {
        const Chat = require('./models/Chat');
        const newMessage = new Chat({
          sender: data.senderId,
          receiver: data.receiverId,
          text: data.text,
          timestamp: new Date(data.timestamp || Date.now()),
        });
        await newMessage.save();

        const User = require('./models/User');
        const sender = await User.findById(data.senderId).select('name');
        const senderName = sender ? sender.name : 'Unknown';

        wss.clients.forEach((client) => {
          if (client.readyState === 1 && client.userId === data.receiverId) {
            client.send(JSON.stringify({
              senderId: data.senderId,
              senderName,
              receiverId: data.receiverId,
              text: data.text,
              timestamp: newMessage.timestamp,
            }));
          }
        });

        if (ws.userId === data.senderId && ws.readyState === 1) {
          ws.send(JSON.stringify({
            senderId: data.senderId,
            senderName,
            receiverId: data.receiverId,
            text: data.text,
            timestamp: newMessage.timestamp,
          }));
        }
        return;
      }

      if (data.roomId && data.text) {
        const ChatRoom = require('./models/ChatRoom');
        const room = await ChatRoom.findById(data.roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
          return;
        }

        const isMember = room.members.some(member => member.toString() === ws.userId);
        const isCreator = room.creator.toString() === ws.userId;
        if (!isMember && !isCreator) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not a room member' }));
          return;
        }

        const user = await User.findById(ws.userId).select('name');
        const senderName = user ? user.name : 'Unknown';

        const messageData = {
          sender: ws.userId,
          senderName,
          text: data.text,
          timestamp: new Date(data.timestamp || Date.now()),
        };
        room.messages.push(messageData);
        await room.save();

        const memberIds = [...room.members.map(m => m.toString()), room.creator.toString()];
        wss.clients.forEach((client) => {
          if (client.readyState === 1 && memberIds.includes(client.userId)) {
            client.send(JSON.stringify({
              roomId: data.roomId,
              senderId: ws.userId,
              senderName,
              text: data.text,
              timestamp: messageData.timestamp,
            }));
          }
        });
        return;
      }

      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Server error' }));
    }
  });

  ws.on('close', () => {});

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('ping', () => { ws.pong(); });

  const interval = setInterval(() => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  }, 30000);

  ws.on('close', () => clearInterval(interval));
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trial')
  .then(() => {
    server.listen(PORT, () => {});
  })
  .catch(err => {});
  module.exports = app;