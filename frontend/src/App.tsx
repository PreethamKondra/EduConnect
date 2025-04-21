import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Chatrooms from './pages/Chatrooms';
import Chat from './pages/Chat';
import BooksRealm from './pages/books/BooksRealm';
import BrowseBooks from './pages/books/BrowseBooks';
import ContributeBooks from './pages/books/ContributeBooks';
import BookRequests from './pages/books/BookRequests';
import MyRequests from './pages/books/MyRequests';
import Wishlist from './pages/books/Wishlist';
import Quiz from './pages/Quiz';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chatrooms" element={<Chatrooms />} />
        <Route path="/books" element={<BooksRealm />}>
          <Route index element={<BrowseBooks />} />
          <Route path="browse" element={<BrowseBooks />} />
          <Route path="contribute" element={<ContributeBooks />} />
          <Route path="requests" element={<BookRequests />} />
          <Route path="my-requests" element={<MyRequests />} />
          <Route path="wishlist" element={<Wishlist />} />
        </Route>
        <Route path="/quiz" element={<Quiz />} />
      </Routes>
    </Router>
  );
};

export default App;