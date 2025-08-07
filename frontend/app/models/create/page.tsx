"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { auth } from "@/lib/auth";
import { apiService } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

export default function CreateModelPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState("Random Forest");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubActions, setGithubActions] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const user = auth.getCurrentUser();
    setCurrentUser(user);
    setIsPremium(auth.isPremium());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const modelData = {
        name,
        type,
        description: description || null,
        github_url: isPremium ? (githubUrl || null) : null,
        github_actions: isPremium ? githubActions : false,
        organization_id: currentUser.id
      };

      const createdModel = await apiService.uploadModel(modelData);
      
      setSuccess("Model created successfully! Redirecting to model details...");
      
      // Redirect to model details page after 2 seconds
      setTimeout(() => {
        router.push(`/models/${createdModel.id}`);
      }, 1000);

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail;
      setError(typeof errorMessage === 'string' ? errorMessage : "Failed to create model. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#0070C0] rounded flex items-center justify-center">
                  <img src="/sap-logo.png" alt="SAP Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xl font-semibold text-gray-900">SAP FairCert</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Welcome, {currentUser?.name || currentUser?.email}
                </span>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-[#0070C0] hover:text-[#005A9E] text-sm"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Model</h1>
              <p className="text-gray-600 mt-1">
                Add a new AI model to your organization for bias certification
              </p>
            </div>

            {!isPremium && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Upgrade to Premium
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Unlock GitHub integration and continuous bias analysis for your models. 
                      Premium features include automatic webhook triggers and advanced code analysis.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push("/upgrade")}
                      className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      Upgrade Now
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0]"
                    placeholder="Enter model name"
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                    Model Type *
                  </label>
                  <select
                    id="type"
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0]"
                  >
                    <option value="Classification Model">Classification Model</option>
                    <option value="Regression Model">Regression Model</option>
                    <option value="Clustering Model">Clustering Model</option>
                    <option value="Anomaly Detection Model">Anomaly Detection Model</option>
                    <option value="Recommendation Model">Recommendation Model</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0]"
                    placeholder="Describe your model's purpose, features, and use case..."
                  />
                </div>

                <div className={`${!isPremium ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-700">
                      GitHub Repository URL
                    </label>
                    {!isPremium && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Premium Feature
                      </span>
                    )}
                  </div>
                  <input
                    type="url"
                    id="githubUrl"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    disabled={!isPremium}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0] ${
                      !isPremium ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder={isPremium ? "https://github.com/username/repository" : "Upgrade to Premium to enable GitHub integration"}
                  />
                  {!isPremium && (
                    <p className="text-sm text-gray-500 mt-1">
                      Upgrade to Premium to connect your GitHub repository for continuous bias analysis
                    </p>
                  )}
                </div>

                <div className={`${!isPremium ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="githubActions"
                        checked={githubActions}
                        onChange={(e) => setGithubActions(e.target.checked)}
                        disabled={!isPremium}
                        className={`h-4 w-4 text-[#0070C0] focus:ring-[#0070C0] border-gray-300 rounded ${
                          !isPremium ? 'cursor-not-allowed' : ''
                        }`}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable GitHub Actions Integration
                      </span>
                    </label>
                    {!isPremium && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Premium Feature
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {isPremium 
                      ? "Automatically trigger bias analysis when code is pushed to the repository"
                      : "Upgrade to Premium to enable automatic bias analysis on code pushes"
                    }
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 border border-red-200 rounded-md p-4"
                  >
                    <p className="text-sm text-red-600">{error}</p>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-50 border border-green-200 rounded-md p-4"
                  >
                    <p className="text-sm text-green-600">{success}</p>
                  </motion.div>
                )}

                                          
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-[#0070C0] text-white rounded-lg hover:bg-[#005A9E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </div>
                    ) : (
                      "Create Model"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
} 