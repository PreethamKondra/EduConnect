import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type QuizQuestion = {
  question: string;
  choices: string[];
  correctAnswer: string;
};

type QuizResults = {
  questions: QuizQuestion[];
  userAnswers: (string | null)[];
  score: number;
};

const Quiz: React.FC = () => {
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [rawQuizData, setRawQuizData] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [quizMode, setQuizMode] = useState<'setup' | 'exam' | 'results'>('setup');
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const token = localStorage.getItem('token');
  const location = useLocation();
  const navigate = useNavigate();

  // Particle background effect
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
        this.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
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
        ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
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

  // Existing useEffect for handling auto file upload
  useEffect(() => {
    const fetchFileFromUrl = async () => {
      if (location.state?.fileUrl && location.state?.fileName) {
        try {
          setIsGenerating(true);
          setErrorMessage('');
          
          const response = await fetch(location.state.fileUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch file');
          }
          
          const blob = await response.blob();
          const fileFromBlob = new File(
            [blob], 
            location.state.fileName, 
            { type: blob.type || 'application/octet-stream' }
          );
          
          setFile(fileFromBlob);
          
          const formData = new FormData();
          formData.append('file', fileFromBlob);
          
          const quizResponse = await fetch('http://localhost:5000/quiz', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          const quizData = await quizResponse.json();
          if (quizResponse.ok) {
            if (quizData.questions && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
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
          console.error('Auto file fetch error:', err);
          setErrorMessage('Error fetching or processing the file. Please try uploading manually.');
        } finally {
          setIsGenerating(false);
        }
      }
    };
    
    fetchFileFromUrl();
  }, [location.state, token]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
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
      console.error('Quiz generation error:', err);
      setErrorMessage('Error connecting to server. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, choice: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = choice;
    setUserAnswers(newAnswers);
  };

  const submitQuiz = () => {
    setQuizMode('results');
    let correctCount = 0;
    quizData.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) {
        correctCount++;
      }
    });
    const results: QuizResults = {
      questions: quizData,
      userAnswers: userAnswers,
      score: correctCount
    };
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
    if (firstQuestion) {
      firstQuestion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderAllQuestions = () => {
    if (!quizData.length) return null;
    
    return (
      <div className="all-questions-container">
        {quizData.map((question, questionIndex) => (
          <div key={questionIndex} className="quiz-question-container animate-slide-in" id={`question-${questionIndex}`}>
            <div className="question-header">
              <h3 className="question-number">Question {questionIndex + 1} of {quizData.length}</h3>
            </div>
            
            <p className="question-text">{question.question}</p>
            
            <div className="choices-container">
              {question.choices.map((choice, choiceIndex) => (
                <div 
                  key={choiceIndex}
                  onClick={() => handleAnswerSelect(questionIndex, choice)}
                  className={`choice-item ${userAnswers[questionIndex] === choice ? 'selected-choice' : ''} animate-choice`}
                >
                  <label className="choice-label">
                    <input 
                      type="radio" 
                      name={`question-${questionIndex}`}
                      checked={userAnswers[questionIndex] === choice}
                      onChange={() => handleAnswerSelect(questionIndex, choice)}
                      className="choice-radio"
                    />
                    <span className="choice-text">{choice}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="submit-container">
          <button 
            onClick={submitQuiz}
            className="submit-button animate-button"
          >
            Submit Quiz
          </button>
        </div>
      </div>
    );
  };

  const renderResultsScreen = () => {
    let score = 0;
    quizData.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) {
        score++;
      }
    });
    
    const percentage = Math.round((score / quizData.length) * 100);
    
    return (
      <div className="results-container animate-fade-in">
        <h3 className="results-heading">Quiz Results</h3>
        
        <div className="score-display">
          <div className="score-number">
            {score} / {quizData.length}
          </div>
          <div className={`score-percentage ${percentage >= 70 ? 'high-score' : percentage >= 50 ? 'medium-score' : 'low-score'}`}>
            {percentage}%
          </div>
        </div>
        
        <div className="questions-review">
          {quizData.map((question, qIndex) => {
            const isCorrect = userAnswers[qIndex] === question.correctAnswer;
            const userAnswer = userAnswers[qIndex];
            const isUnattempted = userAnswer === null;

            return (
              <div key={qIndex} className={`review-question animate-slide-in ${isUnattempted ? 'unattempted-question' : isCorrect ? 'correct-question' : 'incorrect-question'}`} id={`question-${qIndex}`}>
                <div className="question-status-header">
                  <span className={`status-indicator ${isUnattempted ? '' : isCorrect ? 'correct-indicator' : 'incorrect-indicator'}`}>
                    {isUnattempted ? '' : isCorrect ? '✓' : '✗'}
                  </span>
                  <h4 className="review-question-text">{qIndex + 1}. {question.question}</h4>
                </div>
                
                <div className="review-choices">
                  {question.choices.map((choice, cIndex) => (
                    <div 
                      key={cIndex}
                      className={`review-choice ${choice === question.correctAnswer ? 'correct-choice' : userAnswer === choice && !isCorrect ? 'incorrect-choice' : ''}`}
                    >
                      <div className="choice-indicators">
                        {userAnswer === choice && (
                          <span className="user-selection-indicator">Selected</span>
                        )}
                        {choice === question.correctAnswer && (
                          <span className="correct-answer-indicator">Correct</span>
                        )}
                        <span className="choice-content">{choice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="action-buttons">
          <button 
            onClick={resetQuiz}
            className="action-button generate-again-button animate-button"
          >
            Generate Again
          </button>
          <button 
            onClick={newQuiz}
            className="action-button new-quiz-button animate-button"
          >
            New Quiz
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="quiz-container" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: '0',
      fontFamily: "'Manrope', sans-serif",
      background: 'transparent',
      position: 'relative',
      overflow: 'hidden',
      zIndex: 1
    }}>
      {/* Fixed Header */}
      <div className="fixed-header" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        background: 'rgba(30, 41, 59, 0.85)',
        padding: '1rem 0',
        zIndex: 100,
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(18px)'
      }}>
        <h2 className="quiz-title" style={{
          color: '#6366f1',
          fontSize: '2.5rem',
          textAlign: 'center',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>Quiz </h2>
      </div>

      <button
        onClick={() => {
          navigate('/home')
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
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.6)'
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)'
        }}
      >
        <span>←</span> Back to Home
      </button>

      {/* Scrollable Content Area */}
      <div style={{ 
        marginTop: '80px', // Offset to account for fixed header height
        padding: '2rem',
        overflowY: 'auto',
        flexGrow: 1,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%'
      }}>
        {/* Initial Header and Upload Section - Hidden during quiz/results */}
        {quizMode === 'setup' && (
          <div className="intro-section" style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(30, 41, 59, 0.2)',
            borderRadius: '20px',
            margin: '0 auto',
            width: '500px',
            height: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}>
            <h1 className="quote-text" style={{
              color: '#a855f7',
              fontSize: '1.8rem',
              fontFamily: "'Dancing Script', cursive",
              fontWeight: 700,
              textShadow: '0 0 10px rgba(168, 85, 247, 0.7)',
              animation: 'glow 2s ease-in-out infinite alternate',
              marginBottom: '1.5rem'
            }}>
              "Sharpen your minds, Attempt the Quiz!"
            </h1>
            <p style={{ fontSize: '2.5rem', color: '#e2e8f0', marginBottom: '2.5rem' }}>📝</p>
            <div className="upload-section" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem'
            }}>
              <input 
                type="file" 
                accept=".txt,.pdf,.doc,.docx,.ppt,.pptx" 
                onChange={handleFileChange}
                className="file-input" 
                style={{
                  display: 'none'
                }}
                id="file-upload"
              />
              <label htmlFor="file-upload" className="glass-button" style={{
                padding: '1.2rem 2.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: '#e2e8f0',
                fontSize: '1.3rem',
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 5px 20px rgba(168, 85, 247, 0.4), inset 0 0 12px rgba(168, 85, 247, 0.6)',
                transition: 'all 0.3s ease',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 7px 25px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.8)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 5px 20px rgba(168, 85, 247, 0.4), inset 0 0 12px rgba(168, 85, 247, 0.6)';
                e.currentTarget.style.transform = 'scale(1)';
              }}>
                {file ? '🔗 Click below to generate' : '🔗 Choose a File'}
              </label>
              <button 
                onClick={handleGenerateQuiz}
                disabled={!file || isGenerating}
                className="glass-button"
                style={{
                  padding: '1.2rem 2.5rem',
                  background: !file || isGenerating 
                    ? 'rgba(99, 102, 241, 0.5)' 
                    : 'rgba(99, 102, 241, 0.2)',
                  color: '#fff',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  borderRadius: '12px',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  cursor: !file || isGenerating ? 'not-allowed' : 'pointer',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 5px 20px rgba(99, 102, 241, 0.4), inset 0 0 12px rgba(99, 102, 241, 0.6)',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase'
                }}
                onMouseEnter={(e) => {
                  if (file && !isGenerating) {
                    e.currentTarget.style.boxShadow = '0 7px 25px rgba(99, 102, 241, 0.6), inset 0 0 15px rgba(99, 102, 241, 0.8)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 5px 20px rgba(99, 102, 241, 0.4), inset 0 0 12px rgba(99, 102, 241, 0.6)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {isGenerating ? 'GENERATING...' : 'Generate Quiz'}
              </button>
              {isGenerating && (
                <p style={{ 
                  color: '#a855f7', 
                  fontSize: '1.2rem', 
                  marginTop: '1.5rem', 
                  textAlign: 'center' 
                }}>
                
                </p>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="error-message animate-shake" style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            color: '#ef4444',
            padding: '1rem',
            borderRadius: '10px',
            margin: '1.5rem auto',
            maxWidth: '600px',
            textAlign: 'center',
            backdropFilter: 'blur(5px)',
            zIndex: 10
          }}>
            {errorMessage}
          </div>
        )}

        {isGenerating && (
          <div className="loading-indicator animate-fade-in" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '2rem auto',
            padding: '1.5rem',
            background: 'rgba(30, 41, 59, 0.85)',
            borderRadius: '15px',
            backdropFilter: 'blur(18px)',
            maxWidth: '500px',
            zIndex: 10
          }}>
            <div className="spinner" style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid #6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{
              marginLeft: '1rem',
              color: '#e2e8f0',
              fontSize: '1.1rem'
            }}>Generating quiz from your document...</p>
          </div>
        )}

        {quizMode === 'exam' && (
          <div className="quiz-exam-container animate-fade-in" style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(10px)',
            padding: '2rem',
            borderRadius: '20px',
            maxWidth: '900px',
            margin: '1rem auto',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            border: '1px solid transparent',
            backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.7), rgba(30, 41, 59, 0.7)), linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            zIndex: 10
          }}>
            {renderAllQuestions()}
          </div>
        )}
        
        {quizMode === 'results' && (
          <div className="quiz-results-container animate-fade-in" style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(10px)',
            padding: '2rem',
            borderRadius: '20px',
            maxWidth: '900px',
            margin: '0 auto',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            border: '1px solid transparent',
            backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.7), rgba(30, 41, 59, 0.7)), linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            zIndex: 10
          }}>
            {renderResultsScreen()}
          </div>
        )}

        {!quizData.length && rawQuizData && (
          <div className="raw-data-container animate-fade-in" style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(10px)',
            padding: '2rem',
            borderRadius: '20px',
            maxWidth: '900px',
            margin: '2rem auto 0',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            border: '1px solid transparent',
            backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.7), rgba(30, 41, 59, 0.7)), linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            zIndex: 10
          }}>
            <h3 style={{
              color: '#e2e8f0',
              fontSize: '1.5rem',
              marginBottom: '1rem'
            }}>Raw Quiz Data</h3>
            <p style={{
              color: '#d1d5db',
              marginBottom: '1rem'
            }}>
              The AI generated a response that couldn't be formatted as a quiz. Here's the raw output:
            </p>
            <pre style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1.5rem',
              borderRadius: '10px',
              color: '#e2e8f0',
              overflow: 'auto',
              maxHeight: '400px',
              whiteSpace: 'pre-wrap'
            }}>
              {rawQuizData}
            </pre>
          </div>
        )}
      </div>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }

          @keyframes choiceHover {
            0% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0); }
          }

          @keyframes buttonPulse {
            0% { box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }
            50% { box-shadow: 0 8px 20px rgba(99, 102, 241, 0.6); }
            100% { box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }
          }

          @keyframes shakeError {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }

          @keyframes glow {
            from { text-shadow: 0 0 5px #a855f7, 0 0 10px #a855f7; }
            to { text-shadow: 0 0 10px #a855f7, 0 0 20px #a855f7; }
          }

          .animate-fade-in {
            animation: fadeInUp 0.7s ease-out;
          }

          .animate-slide-in {
            animation: slideIn 0.5s ease-out;
          }

          .animate-choice:hover {
            animation: choiceHover 0.6s ease-in-out;
          }

          .animate-button {
            transition: all 0.3s ease;
          }

          .animate-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(168, 85, 247, 0.5);
          }

          .animate-dot {
            transition: all 0.3s ease;
          }

          .animate-dot:hover {
            transform: scale(1.2);
          }

          .animate-shake {
            animation: shakeError 0.5s ease-in-out;
          }

          .quiz-question-container {
            color: #e2e8f0;
            padding: 1rem;
            margin-bottom: 3rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            scroll-margin-top: 150px;
            background: rgba(30, 41, 59, 0.6);
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            backdropFilter: 'blur(10px)',
            border: '1px solid transparent',
            backgroundImage: 'linear-gradient(rgba(30, 41, 59, 0.6), rgba(30, 41, 59, 0.6)), linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }
          
          .question-header {
            margin-bottom: 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 0.8rem;
          }
          
          .question-number {
            font-size: 1.5rem;
            font-weight: 600;
            color: #6366f1;
          }
          
          .question-text {
            font-size: 1.3rem;
            margin-bottom: 2rem;
            line-height: 1.5;
            color: #d1d5db;
          }
          
          .choices-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 2rem;
          }
          
          .choice-item {
            padding: 1rem;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.08);
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.15);
          }
          
          .choice-item:hover {
            background: rgba(255, 255, 255, 0.15);
            transform: translateX(5px);
          }
          
          .selected-choice {
            background: rgba(99, 102, 241, 0.3) !important;
            border-left: 5px solid #e74c3c;
          }
          
          .unattempted-question {
            border-left: 5px solid #e74c3c; /* Reverted to red for unattempted */
          }

          .choice-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            width: 100%;
          }
          
          .choice-radio {
            margin-right: 1rem;
            width: 18px;
            height: 18px;
            accent-color: #6366f1;
          }
          
          .choice-text {
            font-size: 1.1rem;
            color: #e2e8f0;
          }
          
          .submit-container {
            display: flex;
            justifyContent: center;
            margin-top: 3rem;
            margin-bottom: 1rem;
          }
          
          .submit-button {
            padding: 1rem 3rem;
            border-radius: 10px;
            border: none;
            background: linear-gradient(90deg, #2ecc71, #27ae60);
            color: #fff;
            font-size: 1.2rem;
            fontWeight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 14px rgba(46, 204, 113, 0.4);
          }
          
          .submit-button:hover {
            background: linear-gradient(90deg, #27ae60, #219955);
            transform: translateY(-3px);
          }
          
          .results-container {
            color: #e2e8f0;
          }
          
          .results-heading {
            font-size: 2rem;
            text-align: center;
            margin-bottom: 2rem;
            color: #6366f1;
            text-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
          }
          
          .score-display {
            text-align: center;
            margin-bottom: 3rem;
            padding: 1.5rem;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 15px;
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)';
          }
          
          .score-number {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: #e2e8f0;
          }
          
          .score-percentage {
            font-size: 1.8rem;
            font-weight: 600;
          }
          
          .high-score {
            color: #2ecc71;
          }
          
          .medium-score {
            color: #f39c12;
          }
          
          .low-score {
            color: #e74c3c;
          }
          
          .questions-review {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            margin-bottom: 3rem;
          }
          
          .review-question {
            padding: 1.5rem;
            border-radius: 12px;
          }
          
          .correct-question {
            background: rgba(46, 204, 113, 0.1);
            border-left: 5px solid #d3d3d3;
          }
          
          .incorrect-question {
            background: rgba(231, 76, 60, 0.1);
            border-left: 5px solid #e74c3c;
          }
          
          .unattempted-question {
            background: rgba(50, 50, 50, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-left: 5px solid #e74c3c; /* Reverted to red for unattempted */
          }
          
          .question-status-header {
            display: flex;
            align-items: center;
            margin-bottom: 1.2rem;
          }
          
          .status-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: '50%';
            margin-right: 1rem;
            font-weight: bold;
          }
          
          .correct-indicator {
            background: #2ecc71;
            color: #fff;
          }
          
          .incorrect-indicator {
            background: #e74c3c;
            color: #fff;
          }
          
          .review-question-text {
            font-size: 1.2rem;
            font-weight: 500;
            color: #d1d5db;
          }
          
          .review-choices {
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
            margin-left: 2.5rem;
          }
          
          .review-choice {
            padding: 0.8rem;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
          }
          
          .correct-choice {
            background: rgba(46, 204, 113, 0.2);
            border: 1px solid #d3d3d3;
          }
          
          .incorrect-choice {
            background: rgba(231, 76, 60, 0.2);
            border: 1px solid rgba(231, 76, 60, 0.5);
          }
          
          .choice-indicators {
            display: flex;
            align-items: center;
            position: relative;
          }
          
          .user-selection-indicator {
            font-size: 0.8rem;
            background: rgba(99, 102, 241, 0.7);
            color: #fff;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            margin-right: 0.8rem;
          }
          
          .correct-answer-indicator {
            font-size: 0.8rem;
            background: rgba(46, 204, 113, 0.7);
            color: #fff;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            margin-right: 0.8rem;
          }
          
          .choice-content {
            flex-grow: 1;
            color: #e2e8f0;
          }
          
          .action-buttons {
            display: flex;
            justify-content: center;
            gap: 1.5rem;
            margin-top: 2rem;
          }
          
          .action-button {
            padding: 0.8rem 1.8rem;
            border-radius: 10px;
            border: none;
            font-size: 1.1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 14px rgba(0,0,0,0.15);
          }
          
          .generate-again-button {
            background: linear-gradient(90deg, #6366f1, #4f46e5);
            color: #fff;
          }
          
          .generate-again-button:hover {
            background: linear-gradient(90deg, #4f46e5, #4338ca);
            transform: translateY(-3px);
          }
          
          .new-quiz-button {
            background: linear-gradient(90deg, #a855f7, #9333ea);
            color: #fff;
          }
          
          .new-quiz-button:hover {
            background: linear-gradient(90deg, #9333ea, #7e22ce);
            transform: translateY(-3px);
          }
          
          .question-dot {
            transition: all 0.3s ease;
          }
          
          .answered-dot:hover {
            background: rgba(39, 174, 96, 0.5);
            transform: scale(1.1);
          }
          
          .unattempted-dot:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
          }

          @media (max-width: 768px) {
            .header-section {
              flex-direction: column;
              text-align: center;
            }
            .quote-text {
              font-size: 1.5rem;
            }
            .upload-section {
              width: 100%;
              max-width: 100%;
            }
            .fixed-header {
              padding: 0.5rem 0;
            }
            .quiz-container {
              padding: 1rem;
            }
            .quiz-exam-container, .quiz-results-container, .intro-section, .raw-data-container {
              max-width: 100%;
              padding: 1.5rem;
            }
            .question-text {
              font-size: 1.1rem;
            }
            .choice-text {
              font-size: 1rem;
            }
            .submit-button, .action-button {
              padding: 0.8rem 2rem;
              font-size: 1rem;
            }
          }

          @media (max-width: 480px) {
            .quote-text {
              font-size: 1.2rem;
            }
            .fixed-header h2 {
              font-size: 2rem;
            }
            .question-number {
              font-size: 1.3rem;
            }
            .question-text {
              font-size: 1rem;
            }
            .choice-text {
              font-size: 0.9rem;
            }
            .question-dot {
              width: 30px;
              height: 30px;
              font-size: 0.9rem;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Quiz;