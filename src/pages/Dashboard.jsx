import React from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F2F2F3] via-[#EEEEEE] to-[#E8E8E8] flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Cyber AI Portal</h1>
        <p className="text-gray-600 mb-6">Fast, secure incident reporting and AI-assisted guidance.</p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/chat" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-semibold">Open Chat</Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
