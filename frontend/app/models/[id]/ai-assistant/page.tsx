"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/auth";
import { apiService } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const [sessionId, setSessionId] = useState<string>("");
  const [hasGitHubContext, setHasGitHubContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = auth.getCurrentUser();
    setCurrentUser(user);
    
    // Generate unique session ID for this chat
    const newSessionId = `model_${modelId}_${Date.now()}`;
    setSessionId(newSessionId);
    
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

  const checkSessionContext = async () => {
    if (sessionId) {
      try {
        const context = await apiService.getSessionContext(sessionId);
        setHasGitHubContext(context.has_github_code);
      } catch (error) {
        console.error('Error checking session context:', error);
      }
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
      content: `# Hello! 👋

I'm your **AI Assistant** for improving the **${modelData.name}** model.

## 🔗 GitHub Repository
${modelData.github_url || 'Not connected'}

## 📊 Current Model Context
- **Type**: ${modelData.type}
- **Description**: ${modelData.description || 'No description available'}
- **Bias Analysis**: ${biasContext}

## 🛠️ I can help you with:

• **Connect to GitHub** - Link your repository for code analysis
• **Analyze Repository** - Read and understand your code structure  
• **Bias Detection** - Identify bias patterns in your current version
• **Improvement Suggestions** - Get recommendations for bias mitigation
• **Version Creation** - Help create new versions with better fairness

**What would you like to start with?**`,
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

    try {
      // Check if the message is about GitHub or code analysis
      const messageLower = inputMessage.toLowerCase();
      let response;
      
      if (messageLower.includes('github') || messageLower.includes('repo') || messageLower.includes('connect') || 
          messageLower.includes('pull') || messageLower.includes('fetch') || messageLower.includes('code')) {
        // Use the analyze-model endpoint for GitHub-related queries
        response = await apiService.analyzeModelCode({
          model_id: parseInt(modelId),
          user_query: inputMessage,
          session_id: sessionId
        });
      } else {
        // Use the general chat endpoint
        response = await apiService.sendChatMessage({
          message: inputMessage,
          model_id: parseInt(modelId),
          session_id: sessionId
        });
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Check if GitHub context was added
      if (response.github_code_analyzed && !hasGitHubContext) {
        setHasGitHubContext(true);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error.response?.data?.detail || 'Please try again later.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Assistant
                  </h2>
                  <p className="text-sm opacity-90">Let's improve your {model.name} model together</p>
                </div>
                {hasGitHubContext && (
                  <div className="flex items-center space-x-2 bg-green-600 px-3 py-1 rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium">GitHub Context Active</span>
                  </div>
                )}
              </div>
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
                      {message.type === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              // Custom styling for markdown elements
                              h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-base font-semibold mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-semibold mb-1" {...props} />,
                              p: ({node, ...props}) => <p className="mb-2" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="text-sm" {...props} />,
                              code: ({node, inline, ...props}: any) => 
                                inline ? (
                                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />
                                ) : (
                                  <code className="block bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto" {...props} />
                                ),
                              pre: ({node, ...props}) => <pre className="bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto mb-2" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-[#0070C0] pl-4 italic text-gray-600 mb-2" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                              em: ({node, ...props}) => <em className="italic" {...props} />,
                              a: ({node, ...props}) => <a className="text-[#0070C0] hover:underline" {...props} />,
                              table: ({node, ...props}) => <table className="border-collapse border border-gray-300 w-full mb-2" {...props} />,
                              th: ({node, ...props}) => <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left" {...props} />,
                              td: ({node, ...props}) => <td className="border border-gray-300 px-2 py-1" {...props} />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
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
                  onClick={() => setInputMessage("Pull code from GitHub and analyze it")}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                >
                  📥 Pull from GitHub
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