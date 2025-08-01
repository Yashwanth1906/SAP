"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/auth";
import { apiService } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

interface Model {
  id: number;
  organization_id: number;
  name: string;
  type: string;
  description: string | null;
  github_url: string | null;
  github_actions: boolean | null;
  created_at: string;
}

interface Version {
  id: number;
  name: string;
  selection_data: string | null;
  intentional_bias: string | null;
  certification_type_id: number | null;
  report_id: number | null;
  model_id: number;
  created_at: string;
  report?: any;
  certification_type?: any;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = auth.getCurrentUser();
    setCurrentUser(user);
    
    if (modelId) {
      fetchModelDetails();
    }
  }, [modelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchModelDetails = async () => {
    try {
      setIsLoading(true);
      const modelData = await apiService.getModelVersions(parseInt(modelId));
      setModel(modelData);
      setVersions(modelData.versions || []);
      
      // Initialize with welcome message and context
      initializeChat(modelData, modelData.versions || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Failed to load model details. Please try again.');
      console.error('Error fetching model details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeChat = (modelData: Model, versions: Version[]) => {
    const currentVersion = versions[0]; // Get the latest version
    const biasContext = currentVersion?.report ? 
      `Current bias analysis shows: ${currentVersion.report.intentional_bias || 'No bias detected'}. Fairness score: ${currentVersion.report.fairness_score || 'N/A'}.` : 
      'No bias analysis available yet.';

    const welcomeMessage: Message = {
      id: '1',
      type: 'assistant',
      content: `Hello! I'm your AI Assistant for improving the **${modelData.name}** model. \n\n🔗 **GitHub Repository**: ${modelData.github_url || 'Not connected'}\n\n📊 **Current Model Context**:\n- Type: ${modelData.type}\n- Description: ${modelData.description || 'No description available'}\n- ${biasContext}\n\nI can help you:\n• Connect to your GitHub repository to analyze code\n• Read and understand your repository structure\n• Analyze bias patterns in your current version\n• Suggest improvements for bias mitigation\n• Help create new versions with better fairness\n\nWhat would you like to start with?`,
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response (replace with actual API call later)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: generateAIResponse(inputMessage),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('github') || input.includes('repo') || input.includes('connect')) {
      return `I'll help you connect to your GitHub repository at ${model?.github_url || 'your repository URL'}.\n\nTo proceed, I need to:\n1. Authenticate with your GitHub account\n2. Read the repository structure\n3. Analyze the code for potential bias patterns\n4. Extract relevant model files and data\n\nWould you like me to start the GitHub connection process?`;
    }
    
    if (input.includes('read') || input.includes('analyze') || input.includes('code')) {
      return `I'm analyzing your repository code now...\n\n📁 **Repository Structure Detected**:\n- Main model file: model.py\n- Data preprocessing: preprocess.py\n- Training script: train.py\n- Configuration: config.yaml\n\n🔍 **Code Analysis Results**:\n- Found potential bias in feature selection\n- Gender-related features detected in hiring data\n- Age bias patterns identified\n- Education level bias present\n\nWould you like me to provide specific recommendations for bias mitigation?`;
    }
    
    if (input.includes('bias') || input.includes('fairness') || input.includes('improve')) {
      return `Based on the current bias analysis, here are my recommendations:\n\n🎯 **Immediate Actions**:\n1. **Feature Engineering**: Remove or balance gender-related features\n2. **Data Augmentation**: Add more diverse training samples\n3. **Algorithm Tuning**: Implement fairness constraints\n4. **Regularization**: Add bias penalty terms\n\n📈 **Expected Improvements**:\n- Fairness score: ${versions[0]?.report?.fairness_score || 0.65} → 0.85+\n- Bias reduction: 40-60%\n- Model accuracy: Maintained or improved\n\nWould you like me to help implement any of these improvements?`;
    }
    
    if (input.includes('version') || input.includes('create') || input.includes('new')) {
      return `I'll help you create a new improved version of your model.\n\n🔄 **Version Creation Process**:\n1. Apply bias mitigation techniques\n2. Retrain model with fairness constraints\n3. Generate new bias analysis report\n4. Create version with improved metrics\n\nThe new version will be named: **${model?.name}-v${(versions.length + 1).toString().padStart(2, '0')}-Improved**\n\nShould I proceed with creating the improved version?`;
    }
    
    // Default response
    return `I understand you're asking about "${userInput}". \n\nI'm here to help you improve your **${model?.name}** model. I can:\n\n• 🔗 Connect to GitHub repositories\n• 📊 Analyze code for bias patterns  \n• 🎯 Suggest bias mitigation strategies\n• 🔄 Create improved model versions\n• 📈 Monitor fairness metrics\n\nWhat specific aspect would you like to work on?`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#0070C0]"></div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !model) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Model Not Found</h3>
            <p className="text-gray-600 mb-4">{error || 'The requested model could not be found.'}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-[#0070C0] text-white px-4 py-2 rounded hover:bg-[#005A9E] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // --- Use the same navigation/top bar as the model details page ---
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Navigation (copied from model details page) */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#0070C0] rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">BC</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">BiasCertify</span>
                <span className="text-sm text-gray-500">• {model.name}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Welcome, {currentUser?.name || currentUser?.email}
                </span>
                <button
                  onClick={() => router.push(`/models/${model.id}`)}
                  className="text-[#0070C0] hover:text-[#005A9E] text-sm font-medium"
                >
                  Back to Model
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Centered Chatbot Container */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-[75vw] max-w-5xl h-[calc(100vh-4rem)] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col"
            style={{ minHeight: '600px' }}
          >
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-[#0070C0] text-white rounded-t-lg">
              <h2 className="text-lg font-semibold flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Assistant
              </h2>
              <p className="text-sm opacity-90">Let's improve your {model.name} model together</p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.type === 'user'
                          ? 'bg-[#0070C0] text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-2 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white text-gray-900 rounded-lg px-4 py-3 border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">AI is typing...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setInputMessage("Connect to GitHub repository")}
                  className="px-3 py-1 text-xs bg-blue-100 text-[#0070C0] rounded-full hover:bg-blue-200 transition-colors"
                >
                  🔗 Connect GitHub
                </button>
                <button
                  onClick={() => setInputMessage("Analyze repository code")}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                >
                  📊 Analyze Code
                </button>
                <button
                  onClick={() => setInputMessage("Show bias analysis")}
                  className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors"
                >
                  🎯 Bias Analysis
                </button>
                <button
                  onClick={() => setInputMessage("Create improved version")}
                  className="px-3 py-1 text-xs bg-[#0070C0] text-white rounded-full hover:bg-[#005A9E] transition-colors"
                >
                  🔄 New Version
                </button>
              </div>
            </div>

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about improving your model, connecting to GitHub, or analyzing bias..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0070C0] focus:border-transparent resize-none"
                    rows={2}
                    disabled={isTyping}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-[#0070C0] text-white px-6 py-3 rounded-lg hover:bg-[#005A9E] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Send</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
} 