"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
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

export default function VersionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;
  const versionId = params.versionId as string;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const user = auth.getCurrentUser();
    setCurrentUser(user);
    
    if (modelId && versionId) {
      fetchVersionDetails();
    }
  }, [modelId, versionId]);

  const fetchVersionDetails = async () => {
    try {
      setIsLoading(true);
      const modelData = await apiService.getModelVersions(parseInt(modelId));
      setModel(modelData);
      
      // Find the specific version
      const foundVersion = modelData.versions?.find((v: Version) => v.id === parseInt(versionId));
      if (foundVersion) {
        setVersion(foundVersion);
      } else {
        setError('Version not found');
      }
    } catch (error: any) {
      setError('Failed to load version details. Please try again.');
      console.error('Error fetching version details:', error);
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

  const handlePublishVersion = async () => {
    try {
      setIsPublishing(true);
      await apiService.publishVersion(parseInt(versionId));
      // Show success message or redirect
      alert('Version published successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail;
      setError(typeof errorMessage === 'string' ? errorMessage : "Failed to publish version. Please try again.");
    } finally {
      setIsPublishing(false);
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

  if (error || !model || !version) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Version Not Found</h3>
            <p className="text-gray-600 mb-4">{error || 'The requested version could not be found.'}</p>
            <button
              onClick={() => router.push(`/models/${modelId}`)}
              className="bg-[#0070C0] text-white px-4 py-2 rounded hover:bg-[#005A9E] transition-colors"
            >
              Back to Model
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#0070C0] rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">BC</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">BiasCertify</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Welcome, {currentUser?.name || currentUser?.email}
                </span>
                <button
                  onClick={() => router.push(`/models/${modelId}`)}
                  className="text-[#0070C0] hover:text-[#005A9E] text-sm"
                >
                  Back to Model
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Model Information Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{model.name}</h1>
                  <p className="text-gray-600 mt-1">Model ID: {model.id} | Version: {version.name}</p>
                </div>
                <button
                  onClick={handlePublishVersion}
                  disabled={isPublishing}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
                >
                  {isPublishing ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Publishing...
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <span>Publish This Version</span>
                    </>
                  )}
                </button>
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
                    {model.github_url && (
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
                    {model.github_actions !== null && (
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
                  </div>
                </div>
              </div>
            </div>

            {/* Version Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Version Details</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Version Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Version Name:</span>
                      <span className="ml-2 text-gray-900">{version.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Version ID:</span>
                      <span className="ml-2 text-gray-900">{version.id}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Created:</span>
                      <span className="ml-2 text-gray-900">{formatTimeAgo(version.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Configuration</h3>
                  <div className="space-y-3">
                    {version.selection_data && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Selection Criteria:</span>
                        <p className="mt-1 text-gray-900">{version.selection_data}</p>
                      </div>
                    )}
                    {version.intentional_bias && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Intentional Bias Features:</span>
                        <p className="mt-1 text-gray-900">{version.intentional_bias}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Report Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bias Analysis Report</h2>
              {version.report ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Fairness Metrics</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Demographic Parity:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {version.report.fairness_score ? `${(version.report.fairness_score * 100).toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Bias Feature:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {version.report.bias_feature || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Mitigation</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Mitigation Techniques:</span>
                          <p className="mt-1 text-sm text-gray-900">
                            {version.report.mitigation_techniques || 'No mitigation techniques applied'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">SHAP Analysis:</span>
                          <p className="mt-1 text-sm text-gray-900">
                            {version.report.shap || 'SHAP analysis not available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Available</h3>
                  <p className="text-gray-600">
                    Bias analysis report has not been generated yet for this version.
                  </p>
                </div>
              )}
            </div>

            {/* Certification Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Certification Details</h2>
              {version.certification_type ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Certification Information</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Certification Type:</span>
                          <span className="ml-2 text-gray-900">{version.certification_type.name}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Fairness Score:</span>
                          <span className="ml-2 text-gray-900">
                            {version.certification_type.fairness_score ? `${(version.certification_type.fairness_score * 100).toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Description</h3>
                      <p className="text-sm text-gray-900">
                        {version.certification_type.description || 'No description available'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Not Certified</h3>
                  <p className="text-gray-600">
                    This version has not been certified yet. Run the certification process to get certified.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
} 