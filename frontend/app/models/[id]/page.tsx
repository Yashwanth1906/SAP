"use client";

import { useState, useEffect } from "react";
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

export default function ModelDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const user = auth.getCurrentUser();
    setCurrentUser(user);
    setIsPremium(auth.isPremium());
    
    if (modelId) {
      fetchModelDetails();
    }
  }, [modelId]);

  const fetchModelDetails = async () => {
    try {
      setIsLoading(true);
      const modelData = await apiService.getModelVersions(parseInt(modelId));
      setModel(modelData);
      setVersions(modelData.versions || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Failed to load model details. Please try again.');
      console.error('Error fetching model details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMs = now.getTime() - created.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const handleCertifyModel = () => {
    // Handle certification logic here
    console.log("Certifying model:", model?.id);
    // You can add API call here to trigger certification
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

        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{model.name}</h1>
                  <p className="text-gray-600 mt-1">Model ID: {model.id}</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push(`/models/${model.id}/ai-assistant`)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium flex items-center space-x-2 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>AI Assistant</span>
                  </button>
                  <button
                    onClick={() => router.push(`/models/${model.id}/versions/create`)}
                    className="bg-[#0070C0] text-white px-4 py-2 rounded-lg hover:bg-[#005A9E] transition-colors font-medium flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create New Version</span>
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Details</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Type:</span>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {model.type}
                      </span>
                    </div>
                    {model.description && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Description:</span>
                        <p className="mt-1 text-gray-900">{model.description}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-700">Created:</span>
                      <span className="ml-2 text-gray-900">{formatTimeAgo(model.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Organization:</span>
                      <span className="ml-2 text-gray-900">{currentUser?.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Organization ID:</span>
                      <span className="ml-2 text-gray-900">{model.organization_id}</span>
                    </div>
                    {model.github_url && isPremium && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">GitHub:</span>
                        <a 
                          href={model.github_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 text-[#0070C0] hover:text-[#005A9E]"
                        >
                          View Repository
                        </a>
                      </div>
                    )}
                    {model.github_url && !isPremium && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">GitHub:</span>
                        <span className="ml-2 text-gray-500 italic">Premium feature - upgrade to view</span>
                      </div>
                    )}
                    {model.github_actions && isPremium && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">GitHub Actions:</span>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          model.github_actions 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {model.github_actions ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    )}
                    {model.github_actions && !isPremium && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">GitHub Actions:</span>
                        <span className="ml-2 text-gray-500 italic">Premium feature - upgrade to view</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

                                
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Model Versions ({versions.length})
                </h2>
              </div>

              {versions.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No versions yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first version to start the bias certification process.
                  </p>
                  <button
                    onClick={() => router.push(`/models/${model.id}/versions/create`)}
                    className="bg-[#0070C0] text-white px-6 py-3 rounded-lg hover:bg-[#005A9E] transition-colors font-medium"
                  >
                    Create First Version
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {versions.map((version) => (
                    <motion.div
                      key={version.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/models/${model.id}/versions/${version.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{version.name}</h3>
                            <span className="text-sm text-gray-500">Version ID: {version.id}</span>
                          </div>
                          {version.selection_data && (
                            <p className="text-gray-600 mb-3">{version.selection_data}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Created {formatTimeAgo(version.created_at)}</span>
                            {version.report && (
                              <span className="flex items-center space-x-1 text-green-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Report Available</span>
                              </span>
                            )}
                            {version.certification_type && (
                              <span className="flex items-center space-x-1 text-blue-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Certified</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/models/${model.id}/versions/${version.id}`);
                            }}
                            className="text-[#0070C0] hover:text-[#005A9E] text-sm font-medium"
                          >
                            View Details
                          </button>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </AuthGuard>
  );
} 