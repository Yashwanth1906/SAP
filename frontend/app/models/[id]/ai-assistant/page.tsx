"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/auth";
import { apiService } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

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

// Custom components for markdown rendering
const CodeBlock = ({ children, className, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <div className="bg-gray-800 text-gray-200 px-4 py-2 text-sm font-medium flex items-center justify-between">
        <span>{language || 'code'}</span>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Copy code"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      <div className="overflow-x-auto max-w-full">
        <SyntaxHighlighter
          style={tomorrow}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '14px',
            lineHeight: '1.5',
            padding: '16px',
            backgroundColor: '#2d3748',
            minWidth: '100%',
            maxWidth: '100%',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const InlineCode = ({ children }: any) => (
  <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">
    {children}
  </code>
);

const FileNameCode = ({ children }: any) => (
  <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm border border-gray-300">
    {children}
  </span>
);

const CustomMarkdown = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: ({ node, inline, className, children, ...props }: any) => {
          if (inline) {
            // Check if it's a single line (likely a file name or short reference)
            const codeText = String(children);
            const lines = codeText.split('\n').filter(line => line.trim().length > 0);
            
            // Check if it looks like a file path or filename
            const isFilePath = /^[a-zA-Z0-9\/\\_.-]+$/.test(codeText.trim()) && 
                              (codeText.includes('.') || codeText.includes('/') || codeText.includes('\\'));
            
            if (lines.length === 1 && (codeText.length < 50 || isFilePath)) {
              // Single line and short or looks like a file path - treat as file name
              return <FileNameCode {...props}>{children}</FileNameCode>;
            } else {
              // Multi-line or long - treat as inline code
              return <InlineCode {...props}>{children}</InlineCode>;
            }
          }
          
          // For block code, check if it's more than 2 lines
          const codeText = String(children);
          const lines = codeText.split('\n').filter(line => line.trim().length > 0);
          
          // Check if it looks like a list of files or short commands
          const isFileList = lines.every(line => 
            /^[a-zA-Z0-9\/\\_.-]+$/.test(line.trim()) && 
            (line.includes('.') || line.includes('/') || line.includes('\\'))
          );
          
          if (lines.length <= 2 && (isFileList || lines.every(line => line.length < 50))) {
            // 2 lines or less and looks like files - treat as file names
            return (
              <span className="inline-flex flex-wrap gap-1">
                {lines.map((line, index) => (
                  <FileNameCode key={index}>{line}</FileNameCode>
                ))}
              </span>
            );
          } else {
            // More than 2 lines or complex code - treat as code block
            return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
          }
        },
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-5">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-medium text-gray-900 mb-2 mt-4">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="text-gray-700 mb-3 leading-relaxed">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-gray-700">
            {children}
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-[#0070C0] pl-4 py-2 my-4 bg-blue-50 text-gray-700 italic">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#0070C0] hover:underline font-medium"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic text-gray-700">
            {children}
          </em>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border border-gray-300 rounded-lg">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="bg-gray-100 border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-gray-300 px-4 py-2 text-gray-700">
            {children}
          </td>
        ),
        hr: () => (
          <hr className="my-6 border-gray-300" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default function AIAssistantPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;
  
  // Add custom styles for markdown content
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .markdown-content {
        max-width: 100%;
        overflow-wrap: break-word;
        word-wrap: break-word;
      }
      
      .markdown-content pre {
        max-width: 100%;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      
      .markdown-content code {
        max-width: 100%;
        overflow-wrap: break-word;
        word-break: break-word;
      }
      
      .markdown-content table {
        max-width: 100%;
        overflow-x: auto;
        display: block;
      }
      
      .markdown-content img {
        max-width: 100%;
        height: auto;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Add a separate effect for smooth scrolling during streaming
  useEffect(() => {
    if (isTyping) {
      const interval = setInterval(() => {
        scrollToBottom();
      }, 100); // Scroll every 100ms during typing
      return () => clearInterval(interval);
    }
  }, [isTyping]);

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

    // Create a placeholder message for the assistant response with initial "thinking" content
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: 'AI is thinking...',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Check if the message is about GitHub or code analysis
      const messageLower = inputMessage.toLowerCase();
      let response;
      
      if (messageLower.includes('github') || messageLower.includes('repo') || messageLower.includes('connect') || 
          messageLower.includes('pull') || messageLower.includes('fetch') || messageLower.includes('code')) {
        // Use the streaming analyze-model endpoint for GitHub-related queries
        await apiService.analyzeModelCodeStream({
          model_id: parseInt(modelId),
          user_query: inputMessage,
          session_id: sessionId
        }, (chunk: string) => {
          // Update the assistant message with the streaming content
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: msg.content === 'AI is thinking...' ? chunk : msg.content + chunk }
              : msg
          ));
        });
      } else {
        // Use the streaming chat endpoint
        await apiService.sendChatMessageStream({
          message: inputMessage,
          model_id: parseInt(modelId),
          session_id: sessionId
        }, (chunk: string) => {
          // Update the assistant message with the streaming content
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: msg.content === 'AI is thinking...' ? chunk : msg.content + chunk }
              : msg
          ));
        });
      }
      
      // Check if GitHub context was added (this would need to be handled differently with streaming)
      // For now, we'll keep the existing logic but it might need adjustment
      if (messageLower.includes('github') || messageLower.includes('repo') || messageLower.includes('connect')) {
        setHasGitHubContext(true);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Update the assistant message with error content
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: `Sorry, I encountered an error: ${error.response?.data?.detail || 'Please try again later.'}` }
          : msg
      ));
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

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
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

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-[#0070C0] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BC</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">BiasCertify</h1>
                <p className="text-sm text-gray-500">AI Assistant</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-500">Model:</span>
                <span className="ml-2 font-medium text-gray-900">{model.name}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Type:</span>
                <span className="ml-2 text-gray-700">{model.type}</span>
              </div>
              {hasGitHubContext && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>GitHub Connected</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setInputMessage("Pull code from GitHub and analyze it")}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                📥 Pull from GitHub
              </button>
              <button
                onClick={() => setInputMessage("Analyze repository code")}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                📊 Analyze Code
              </button>
              <button
                onClick={() => setInputMessage("Show bias analysis")}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                🎯 Bias Analysis
              </button>
              <button
                onClick={() => setInputMessage("Create improved version")}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                🔄 New Version
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4">
            <button
              onClick={() => router.push(`/models/${model.id}`)}
              className="w-full px-3 py-2 text-sm text-[#0070C0] hover:bg-blue-50 rounded-lg transition-colors"
            >
              ← Back to Model
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{model.name}</h2>
                <p className="text-sm text-gray-500">AI Assistant • {currentUser?.name || currentUser?.email}</p>
              </div>
              <div className="flex items-center space-x-2">
                {hasGitHubContext && (
                  <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>GitHub Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="px-4 py-6 space-y-6">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-4xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                      {message.type === 'assistant' && (
                        <div className="w-8 h-8 bg-[#0070C0] rounded-full flex items-center justify-center mb-2">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-6 py-4 ${
                          message.type === 'user'
                            ? 'bg-[#0070C0] text-white max-w-2xl'
                            : 'bg-white text-gray-900 shadow-sm border border-gray-200 w-full'
                        }`}
                      >
                        {message.type === 'assistant' ? (
                          <div className="markdown-content">
                            {message.content === 'AI is thinking...' ? (
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-[#0070C0] rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-[#0070C0] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-2 h-2 bg-[#0070C0] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <span className="text-sm text-gray-500">AI is thinking...</span>
                              </div>
                            ) : (
                              <CustomMarkdown content={message.content} />
                            )}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        )}
                      </div>
                      <div className={`text-xs mt-2 ${
                        message.type === 'user' ? 'text-blue-100 text-right' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {message.type === 'user' && (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center ml-3 mb-2">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about improving your model, connecting to GitHub, or analyzing bias..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#0070C0] focus:border-transparent resize-none bg-gray-50 focus:bg-white transition-colors"
                  rows={1}
                  disabled={isTyping}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-[#0070C0] text-white p-3 rounded-2xl hover:bg-[#005A9E] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
} 