import { useState, useRef, useEffect } from 'react';
import { Shield, FileText, Activity, AlertTriangle, BookOpen } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import QuickActionButton from '../components/QuickActionButton';
import MessageInput from '../components/MessageInput';
import Footer from '../components/Footer';

// 🔗 CHANGE THIS TO YOUR TUNNEL URL
const OLLAMA_API_URL = 'https://wd5cjm61-11434.inc1.devtunnels.ms/api/chat';

// 🔁 MODEL NAME
const OLLAMA_MODEL_NAME = 'phi3';

// 🤝 Small compliments between questions
const PRAISE_MESSAGES = ['Great, thank you!', 'Excellent.', 'Got it.', 'Perfect, thanks.', 'Nice.'];

// 🧾 All report fields (except evidence)
const FILE_REPORT_FIELDS = [
  { key: 'name', question: 'What is your full name?', min: 3, max: 50, required: true },
  { key: 'role', question: 'Select your role:', min: 5, max: 40, required: true },
  { key: 'department', question: 'Enter your Department / Unit:', min: 2, max: 50, required: true },
  { key: 'location', question: 'Enter your Location / Station:', min: 2, max: 50, required: true },

  { key: 'complaintType', question: 'What is the complaint type?', min: 3, max: 50, required: true },
  { key: 'incidentDate', question: 'Select the incident date:', min: 8, max: 10, required: true },
  { key: 'incidentTime', question: 'Select the incident time:', min: 4, max: 5, required: true },
  { key: 'description', question: 'Describe the incident in detail:', min: 20, max: 500, required: true },
  { key: 'suspectedSource', question: 'Who or what is the suspected source? (you can write "unknown")', min: 3, max: 100, required: true }
];

function Chat() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hello! I'm Cyber AI Assistant, your 24/7 cybersecurity support system.",
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  ]);

  const [inputValue, setInputValue] = useState('');

  const [isFileReportActive, setIsFileReportActive] = useState(false);
  const [fileReportStep, setFileReportStep] = useState(0);
  const [isEvidenceStep, setIsEvidenceStep] = useState(false);

  const [fileReportData, setFileReportData] = useState({
    name: '',
    role: '',
    department: '',
    location: '',
    complaintType: '',
    incidentDate: '',
    incidentTime: '',
    description: '',
    suspectedSource: '',
    evidence: []
  });

  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (!chatContainerRef.current) return;
    chatContainerRef.current.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const pushAiMessage = (text) => {
    const msg = {
      id: (Date.now() + Math.random()).toString(),
      text,
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleSendFiles = (files) => {
    if (!files || files.length === 0) return;

    const newMessages = [];

    Array.from(files).forEach(file => {
      const objectUrl = URL.createObjectURL(file);

      const attachment = {
        id: `${Date.now()}-${file.name}`,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        url: objectUrl,
        size: file.size,
        mimeType: file.type
      };

      const msg = {
        id: `${Date.now()}-${Math.random()}`,
        text: attachment.type === 'image' ? '📷 Evidence image' : `📎 Evidence file: ${attachment.name}`,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        attachments: [attachment]
      };

      newMessages.push(msg);

      if (isFileReportActive && isEvidenceStep) {
        setFileReportData(prev => ({
          ...prev,
          evidence: [...prev.evidence, { name: file.name, size: file.size }]
        }));
      }
    });

    setMessages(prev => [...prev, ...newMessages]);
  };

  const processFileReportAnswer = (userText) => {
    if (isEvidenceStep) {
      if (userText.toLowerCase() !== 'done') {
        pushAiMessage('Please upload any evidence using the attachment button. When finished, type "done".');
        return;
      }

      setIsFileReportActive(false);
      setIsEvidenceStep(false);
      setFileReportStep(0);

      const finalPayload = { ...fileReportData };
      const finalJson = JSON.stringify(finalPayload, null, 2);

      pushAiMessage(finalJson);
      return;
    }

    const field = FILE_REPORT_FIELDS[fileReportStep];
    if (!field) {
      setIsEvidenceStep(true);
      pushAiMessage(
        'Now please upload any evidence files (images/documents). When finished, type "done".'
      );
      return;
    }

    const len = userText.length;
    if (field.min && len < field.min) {
      pushAiMessage(`Too short. Min ${field.min} characters.`);
      return;
    }
    if (field.max && len > field.max) {
      pushAiMessage(`Too long. Max ${field.max} characters.`);
      return;
    }

    if (field.key === 'incidentDate') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(userText)) {
        pushAiMessage('Use date format YYYY-MM-DD.');
        return;
      }
    }

    if (field.key === 'incidentTime') {
      if (!/^\d{2}:\d{2}$/.test(userText)) {
        pushAiMessage('Use time format HH:MM.');
        return;
      }
    }

    setFileReportData(prev => ({ ...prev, [field.key]: userText }));

    if (field.key === 'name') pushAiMessage(`Nice to meet you, ${userText}.`);
    else pushAiMessage(PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)]);

    const nextIndex = fileReportStep + 1;
    if (nextIndex < FILE_REPORT_FIELDS.length) {
      setFileReportStep(nextIndex);
      pushAiMessage(FILE_REPORT_FIELDS[nextIndex].question);
    } else {
      setIsEvidenceStep(true);
      pushAiMessage('Upload evidence now. Type "done" when finished.');
    }
  };

  const handleFileReportQuickAnswer = (answer) => {
    if (!isFileReportActive) return;

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: answer,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }]);

    processFileReportAnswer(answer);
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    const userText = inputValue.trim();
    setInputValue('');

    const userMessage = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setMessages(prev => [...prev, userMessage]);

    if (isFileReportActive) {
      processFileReportAnswer(userText);
      return;
    }

    try {
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await fetch(OLLAMA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL_NAME,
          messages: apiMessages,
          stream: false
        })
      });

      const data = await res.json();
      const aiText = data?.message?.content || 'Sorry, I could not generate a response.';

      setMessages(prev => [...prev, {
        id: (Date.now() + 3).toString(),
        text: aiText,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }]);

    } catch (err) {
      console.error('Error reaching AI server:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 4).toString(),
        text: 'Failed to reach the AI server.',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }]);
    }
  };

  const handleQuickAction = (action) => {
    if (action === 'File Report') {
      setIsFileReportActive(true);
      setIsEvidenceStep(false);
      setFileReportStep(0);

      setFileReportData({
        name: '',
        role: '',
        department: '',
        location: '',
        complaintType: '',
        incidentDate: '',
        incidentTime: '',
        description: '',
        suspectedSource: '',
        evidence: []
      });

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: 'File Report initiated',
        sender: 'user',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }]);

      pushAiMessage(FILE_REPORT_FIELDS[0].question);
      return;
    }

    setMessages(prev => [...prev, {
      id: (Date.now() + 5).toString(),
      text: `${action} action is not implemented yet.`,
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }]);
  };

  const currentFieldKey =
    isFileReportActive && !isEvidenceStep
      ? FILE_REPORT_FIELDS[fileReportStep]?.key
      : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F2F2F3] via-[#EEEEEE] to-[#E8E8E8] flex flex-col">

      <header className="bg-gradient-to-r from-[#002B5C] via-[#003366] to-[#1B3A5F] border-b-4 border-[#0066CC] py-6 px-8 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="bg-gradient-to-br from-[#0078D4] to-[#00BCD4] p-3 rounded-lg shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-wide">Cyber AI Assistant</h1>
            <p className="text-[#7D9CB7] text-sm mt-1">24/7 intelligent support for incident response</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-6">
        <div className="bg-white rounded-lg shadow-2xl border border-[#7D9CB7]/30 overflow-hidden flex flex-col" style={{ height: '82vh' }}>
          
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map(message => (
              <ChatMessage
                key={message.id}
                message={message}
                showRoleDropdown={
                  isFileReportActive &&
                  !isEvidenceStep &&
                  currentFieldKey === 'role' &&
                  message.sender === 'ai' &&
                  message.text.startsWith('Select your role')
                }
                showDatePicker={
                  isFileReportActive &&
                  !isEvidenceStep &&
                  currentFieldKey === 'incidentDate' &&
                  message.sender === 'ai'
                }
                showTimePicker={
                  isFileReportActive &&
                  !isEvidenceStep &&
                  currentFieldKey === 'incidentTime' &&
                  message.sender === 'ai'
                }
                onQuickAnswer={handleFileReportQuickAnswer}
              />
            ))}
          </div>

          <div className="px-6 py-5 bg-gradient-to-r from-[#F2F2F3] to-[#EEEEEE] border-t-2">
            <h3 className="text-[#2C3E50] text-sm font-bold mb-3 uppercase">Quick Actions:</h3>
            <div className="grid grid-cols-4 gap-3">
              <QuickActionButton icon={<FileText className="w-5 h-5" />} label="File Report" onClick={() => handleQuickAction("File Report")} />
              <QuickActionButton icon={<Activity className="w-5 h-5" />} label="Check Status" onClick={() => handleQuickAction("Check Status")} />
              <QuickActionButton icon={<AlertTriangle className="w-5 h-5" />} label="Escalate" onClick={() => handleQuickAction("Escalate")} />
              <QuickActionButton icon={<BookOpen className="w-5 h-5" />} label="Playbooks" onClick={() => handleQuickAction("Playbooks")} />
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-semibold">AI suggestion – verify before applying</span>
            </div>
          </div>

          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            onSendFiles={handleSendFiles}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Chat;
