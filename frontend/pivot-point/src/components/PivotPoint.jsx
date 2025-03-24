import React, { useState, useEffect } from 'react';

// Update the API_URL constant at the top
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const PivotPoint = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [decisions, setDecisions] = useState([]);
  const [archivedDecisions, setArchivedDecisions] = useState([]);
  const [currentDecision, setCurrentDecision] = useState({
    id: Date.now(),
    title: 'New Decision',
    pros: [],
    cons: [],
    archived: false,
    createdAt: new Date().toISOString()
  });
  const [newItemText, setNewItemText] = useState('');
  const [newItemWeight, setNewItemWeight] = useState(5);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(1); // Default user ID

  // Calculate totals
  const prosTotal = currentDecision.pros.reduce((sum, item) => sum + item.weight, 0);
  const consTotal = currentDecision.cons.reduce((sum, item) => sum + item.weight, 0);
  
  // Determine recommendation
  const getRecommendation = () => {
    const ratio = prosTotal / Math.max(1, Math.abs(consTotal));
    const difference = prosTotal - Math.abs(consTotal);
    
    if (ratio >= 2) {
      return { type: 'yes', text: 'Yes' };
    } else if (difference >= 10) {
      return { type: 'yes', text: 'Yes' };
    } else if (ratio <= 0.5 || difference <= -10) {
      return { type: 'no', text: 'No' };
    } else {
      return { type: 'maybe', text: 'Maybe' };
    }
  };
  
  const recommendation = getRecommendation();
  
  // Calculate scale tilt
  const calculateTilt = () => {
    // Map the difference to a degree between -30 and 30
    const difference = prosTotal - Math.abs(consTotal);
    const maxDiff = 30;
    return Math.max(-30, Math.min(30, difference / 3));
  };
  
  const tiltDegree = calculateTilt();
  
  // Add item to pros or cons
  const addItem = async (type) => {
    if (!newItemText.trim()) return;
    
    try {
      // Check if the decision exists in the database (has a numeric ID)
      // If not, save it first
      let targetDecision = currentDecision;
      
      // If the decision ID is a large timestamp-like number and not yet saved to DB
      if (!decisions.some(d => d.id === currentDecision.id)) {
        console.log("Saving decision before adding item...");
        const response = await fetch(`${API_URL}/decisions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            title: currentDecision.title
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save decision: ${response.status}`);
        }
        
        // Get the new decision with server-assigned ID
        const savedDecision = await response.json();
        console.log("Decision saved with ID:", savedDecision.id);
        
        // Update our current decision with the server ID
        targetDecision = {
          ...currentDecision,
          id: savedDecision.id
        };
        setCurrentDecision(targetDecision);
        
        // Add to decisions list
        const updatedDecisions = [...decisions, targetDecision];
        setDecisions(updatedDecisions);
      }
      
      // Now add the item using the proper decision ID
      console.log(`Adding ${type} to decision ${targetDecision.id}...`);
      const response = await fetch(`${API_URL}/decisions/${targetDecision.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newItemText,
          weight: type === 'pro' ? Math.abs(newItemWeight) : -Math.abs(newItemWeight),
          type: type
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add item: ${response.status}`);
      }
      
      const newItem = await response.json();
      
      // Update the decision with the new item
      const updatedDecision = { ...targetDecision };
      if (type === 'pro') {
        updatedDecision.pros = [...targetDecision.pros, newItem];
      } else {
        updatedDecision.cons = [...targetDecision.cons, newItem];
      }
      
      setCurrentDecision(updatedDecision);
      
      // Update the decision in the list
      const updatedDecisions = decisions.map(d => 
        d.id === updatedDecision.id ? updatedDecision : d
      );
      
      if (!updatedDecisions.some(d => d.id === updatedDecision.id)) {
        updatedDecisions.push(updatedDecision);
      }
      
      setDecisions(updatedDecisions);
      setNewItemText('');
      setNewItemWeight(5);
    } catch (error) {
      console.error(`Error adding ${type}:`, error);
      setError(`Failed to add ${type}: ${error.message}`);
    }
  };
  
  // Remove item
  const removeItem = async (id, type) => {
    try {
      await fetch(`${API_URL}/items/${id}`, {
        method: 'DELETE'
      });
      
      const updatedDecision = { ...currentDecision };
      if (type === 'pro') {
        updatedDecision.pros = currentDecision.pros.filter(item => item.id !== id);
      } else {
        updatedDecision.cons = currentDecision.cons.filter(item => item.id !== id);
      }
      
      setCurrentDecision(updatedDecision);
      
      // Update the decision in the list
      const updatedDecisions = decisions.map(d => 
        d.id === updatedDecision.id ? updatedDecision : d
      );
      setDecisions(updatedDecisions);
    } catch (error) {
      console.error(`Error removing ${type}:`, error);
      setError(`Failed to remove ${type}`);
    }
  };
  
  // Save current decision
  const saveDecision = async (decision) => {
    try {
      // If the decision exists in our local state, update it. Otherwise, create a new one.
      const exists = decisions.some(d => d.id === decision.id);
      
      if (exists) {
        await fetch(`${API_URL}/decisions/${decision.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: decision.title,
            archived: decision.archived
          }),
        });
      } else {
        const response = await fetch(`${API_URL}/decisions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            title: decision.title
          }),
        });
        const newDecision = await response.json();
        decision.id = newDecision.id;
      }
      
      // Update the local state as before
      const updatedDecisions = decisions.map(d => 
        d.id === decision.id ? decision : d
      );
      
      if (!updatedDecisions.some(d => d.id === decision.id)) {
        updatedDecisions.push(decision);
      }
      
      setDecisions(updatedDecisions);
    } catch (error) {
      console.error("Error saving decision:", error);
      setError("Failed to save decision");
    }
  };
  
  // Create new decision
  const createNewDecision = () => {
    // Save current decision if it has items
    if ((currentDecision.pros.length > 0 || currentDecision.cons.length > 0) && 
        !decisions.some(d => d.id === currentDecision.id)) {
      saveDecision(currentDecision);
    }
    
    const newDecision = {
      id: Date.now(), // This is a temporary ID
      title: 'New Decision',
      pros: [],
      cons: [],
      archived: false,
      createdAt: new Date().toISOString()
    };
    
    setCurrentDecision(newDecision);
  };
  
  // Load a decision
  const loadDecision = (id) => {
    const decision = [...decisions, ...archivedDecisions].find(d => d.id === id);
    if (decision) {
      setCurrentDecision(decision);
    }
  };
  
  // Archive a decision
  const archiveDecision = async (id) => {
    const decision = decisions.find(d => d.id === id);
    if (!decision) return;
    
    try {
      // Update decision on the server first
      await fetch(`${API_URL}/decisions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archived: true
        }),
      });
      
      // Update decision in local state
      const updatedDecision = { ...decision, archived: true };
      
      // Remove from active
      const updatedDecisions = decisions.filter(d => d.id !== id);
      setDecisions(updatedDecisions);
      
      // Add to archived
      const updatedArchived = [...archivedDecisions, updatedDecision];
      setArchivedDecisions(updatedArchived);
      
      // If current decision is archived, create new one
      if (currentDecision.id === id) {
        createNewDecision();
      }
    } catch (error) {
      console.error("Error archiving decision:", error);
      setError("Failed to archive decision");
    }
  };

  // Restore a decision from archive
  const restoreDecision = async (id) => {
    const decision = archivedDecisions.find(d => d.id === id);
    if (!decision) return;
    
    try {
      // Update decision on the server first
      await fetch(`${API_URL}/decisions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archived: false
        }),
      });
      
      // Update decision in local state
      const updatedDecision = { ...decision, archived: false };
      
      // Remove from archived
      const updatedArchived = archivedDecisions.filter(d => d.id !== id);
      setArchivedDecisions(updatedArchived);
      
      // Add to active
      const updatedDecisions = [...decisions, updatedDecision];
      setDecisions(updatedDecisions);
      
      // Load the restored decision
      setCurrentDecision(updatedDecision);
    } catch (error) {
      console.error("Error restoring decision:", error);
      setError("Failed to restore decision");
    }
  };
  
  // Update decision title
  const updateTitle = (title) => {
    const updatedDecision = { ...currentDecision, title };
    setCurrentDecision(updatedDecision);
    saveDecision(updatedDecision);
  };
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', !darkMode);
  };
  
  // Load saved decisions from API
  const fetchDecisions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching decisions from: ${API_URL}/decisions?user_id=${userId}`);
      const response = await fetch(`${API_URL}/decisions?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Received decision data:", data);
      
      setDecisions(data.active || []);
      setArchivedDecisions(data.archived || []);
      
      if (data.active && data.active.length > 0) {
        setCurrentDecision(data.active[0]);
      }
    } catch (error) {
      console.error("Error fetching decisions:", error);
      setError(`Failed to load decisions: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load saved decisions and preferences on mount
  useEffect(() => {
    const storedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(storedDarkMode);
    
    fetchDecisions();
  }, []);
  
  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  return (
    <div className={`h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {error}
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-40">
          <div className="bg-white p-4 rounded shadow-lg">
            Loading...
          </div>
        </div>
      )}
      
      {/* Sidebar */}
      <div className={`w-64 p-4 border-r ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Pivot Point</h1>
          <button 
            onClick={toggleDarkMode} 
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        
        <button 
          onClick={createNewDecision}
          className={`w-full py-2 px-4 mb-4 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
        >
          + New Decision
        </button>
        
        <h2 className="font-bold mb-2">Active Decisions</h2>
        <ul className="mb-4 space-y-1">
          {decisions.map(decision => (
            <li key={decision.id} className="flex justify-between items-center">
              <button 
                onClick={() => loadDecision(decision.id)}
                className={`text-left overflow-hidden overflow-ellipsis whitespace-nowrap ${currentDecision.id === decision.id ? (darkMode ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold') : ''}`}
              >
                {decision.title}
              </button>
              <button 
                onClick={() => archiveDecision(decision.id)}
                className={`text-xs px-1 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Archive
              </button>
            </li>
          ))}
          {decisions.length === 0 && (
            <li className="text-gray-500 text-sm">No active decisions</li>
          )}
        </ul>
        
        <button 
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
        >
          <span className="mr-1">{showArchived ? '▼' : '►'}</span> Archived ({archivedDecisions.length})
        </button>
        
        {showArchived && (
          <ul className="mt-2 pl-4 space-y-1">
            {archivedDecisions.map(decision => (
              <li key={decision.id} className="flex justify-between items-center">
                <button 
                  onClick={() => loadDecision(decision.id)}
                  className="text-left overflow-hidden overflow-ellipsis whitespace-nowrap text-gray-500"
                >
                  {decision.title}
                </button>
                <button 
                  onClick={() => restoreDecision(decision.id)}
                  className={`text-xs px-1 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Restore
                </button>
              </li>
            ))}
            {archivedDecisions.length === 0 && (
              <li className="text-gray-500 text-sm">No archived decisions</li>
            )}
          </ul>
        )}
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="mb-4">
          <input
            type="text"
            value={currentDecision.title}
            onChange={(e) => updateTitle(e.target.value)}
            className={`text-2xl font-bold w-full p-2 border-b ${
              darkMode 
                ? 'bg-gray-900 border-gray-700 text-white' 
                : 'bg-gray-100 border-gray-300 text-gray-900'
            }`}
          />
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Pros List */}
          <div className={`flex-1 rounded-lg p-4 ${darkMode ? 'bg-green-900' : 'bg-green-50'}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
              Pros (Total: {prosTotal})
            </h2>
            <ul className="space-y-2 mb-4">
              {currentDecision.pros.map(item => (
                <li 
                  key={item.id} 
                  className={`flex justify-between items-center p-2 rounded ${
                    darkMode ? 'bg-green-800 text-white' : 'bg-white text-gray-800'
                  } shadow-sm`}
                >
                  <span>{item.text}</span>
                  <div className="flex items-center">
                    <span className={`font-bold ${item.weight > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {item.weight > 0 ? '+' : ''}{item.weight}
                    </span>
                    <button 
                      onClick={() => removeItem(item.id, 'pro')}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
              {currentDecision.pros.length === 0 && (
                <li className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                  No pros added yet
                </li>
              )}
            </ul>
            <button 
              onClick={() => addItem('pro')}
              className={`w-full py-2 rounded ${
                darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              + Add Pro
            </button>
          </div>
          
          {/* Cons List */}
          <div className={`flex-1 rounded-lg p-4 ${darkMode ? 'bg-red-900' : 'bg-red-50'}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
              Cons (Total: {Math.abs(consTotal)})
            </h2>
            <ul className="space-y-2 mb-4">
              {currentDecision.cons.map(item => (
                <li 
                  key={item.id} 
                  className={`flex justify-between items-center p-2 rounded ${
                    darkMode ? 'bg-red-800 text-white' : 'bg-white text-gray-800'
                  } shadow-sm`}
                >
                  <span>{item.text}</span>
                  <div className="flex items-center">
                    <span className="font-bold text-red-500">
                      {item.weight}
                    </span>
                    <button 
                      onClick={() => removeItem(item.id, 'con')}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
              {currentDecision.cons.length === 0 && (
                <li className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                  No cons added yet
                </li>
              )}
            </ul>
            <button 
              onClick={() => addItem('con')}
              className={`w-full py-2 rounded ${
                darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              + Add Con
            </button>
          </div>
        </div>
        
        {/* Scale Visualization */}
        <div className={`p-6 rounded-lg mb-8 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="relative h-40 mb-8">
            <div className="absolute left-1/2 top-4 w-4 h-24 bg-gray-500 transform -translate-x-1/2 rounded"></div>
            <div 
              className="absolute left-1/2 top-4 w-64 h-8 bg-gray-400 transform -translate-x-1/2 origin-center transition-transform duration-500"
              style={{ transform: `translateX(-50%) rotate(${tiltDegree}deg)` }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-32 bg-green-500 rounded-l-lg"></div>
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-red-500 rounded-r-lg"></div>
            </div>
            <div className="absolute left-1/4 bottom-0 transform -translate-x-1/2 text-center">
              <div className={`font-bold text-xl ${darkMode ? 'text-green-400' : 'text-green-600'}`}>Pros</div>
              <div className="font-bold">{prosTotal}</div>
            </div>
            <div className="absolute right-1/4 bottom-0 transform translate-x-1/2 text-center">
              <div className={`font-bold text-xl ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Cons</div>
              <div className="font-bold">{Math.abs(consTotal)}</div>
            </div>
          </div>
          
          <div 
            className={`inline-block px-6 py-3 rounded-full font-bold text-xl ${
              recommendation.type === 'yes' 
                ? (darkMode ? 'bg-green-800 text-green-200' : 'bg-green-500 text-white') 
                : recommendation.type === 'no'
                ? (darkMode ? 'bg-red-800 text-red-200' : 'bg-red-500 text-white')
                : (darkMode ? 'bg-yellow-700 text-yellow-200' : 'bg-yellow-400 text-gray-800')
            }`}
          >
            Recommendation: {recommendation.text}
          </div>
        </div>
        
        {/* Add new item form */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="font-bold mb-2">Add new item</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Enter your point here..."
              className={`flex-1 p-2 rounded border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            />
            <div className="flex items-center">
              <span className="mr-2">Weight:</span>
              <input
                type="number"
                min="-10"
                max="10"
                value={newItemWeight}
                onChange={(e) => setNewItemWeight(parseInt(e.target.value || "0"))}
                className={`w-16 p-2 rounded border ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => addItem('pro')}
                className={`px-4 py-2 rounded ${
                  darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-500 hover:bg-green-600'
                } text-white`}
              >
                Add Pro
              </button>
              <button 
                onClick={() => addItem('con')}
                className={`px-4 py-2 rounded ${
                  darkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-500 hover:bg-red-600'
                } text-white`}
              >
                Add Con
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PivotPoint;
