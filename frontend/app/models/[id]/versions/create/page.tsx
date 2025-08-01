"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { auth } from "@/lib/auth";
import { apiService } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

export default function CreateVersionPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [model, setModel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [versionName, setVersionName] = useState("");
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [selectionCriteria, setSelectionCriteria] = useState("");
  const [intentionalBias, setIntentionalBias] = useState("");
  const [certificationType, setCertificationType] = useState("");

  useEffect(() => {
    const user = auth.getCurrentUser();
    setCurrentUser(user);
    
    if (modelId) {
      fetchModelDetails();
    }
  }, [modelId]);

  const fetchModelDetails = async () => {
    try {
      const modelData = await apiService.getModelVersions(parseInt(modelId));
      setModel(modelData);
    } catch (error: any) {
      setError('Failed to load model details.');
      console.error('Error fetching model details:', error);
    }
  };

  const handleModelFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setModelFile(file);
    }
  };

  const handleDatasetFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDatasetFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // For now, we'll simulate the version creation
      // In a real implementation, you would upload files and create the version
      const versionData = {
        name: versionName,
        selection_data: selectionCriteria,
        intentional_bias: intentionalBias,
        model_id: parseInt(modelId),
        certification_type_id: certificationType ? parseInt(certificationType) : null
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess("Version created successfully! Redirecting to version details...");
      
      // Redirect to version details page after 2 seconds
      setTimeout(() => {
        router.push(`/models/${modelId}/versions/1`); // Assuming version ID 1 for demo
      }, 2000);

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail;
      setError(typeof errorMessage === 'string' ? errorMessage : "Failed to create version. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCertifyModel = async () => {
    try {
      setIsLoading(true);
      setError("");

      await apiService.certifyModel(parseInt(modelId));
      
      setSuccess("Model certification process started successfully!");
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail;
      setError(typeof errorMessage === 'string' ? errorMessage : "Failed to certify model. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!model) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#0070C0]"></div>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Version</h1>
              <p className="text-gray-600 mt-1">
                Create a new version for model: <span className="font-semibold">{model.name}</span>
              </p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Version Name */}
                <div>
                  <label htmlFor="versionName" className="block text-sm font-medium text-gray-700 mb-2">
                    Version Name *
                  </label>
                  <input
                    type="text"
                    id="versionName"
                    required
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0]"
                    placeholder="e.g., v1.0, v2.1-beta, etc."
                  />
                </div>

                {/* Model File Upload */}
                <div>
                  <label htmlFor="modelFile" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Model File *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="space-y-2">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <label htmlFor="modelFile" className="relative cursor-pointer bg-white rounded-md font-medium text-[#0070C0] hover:text-[#005A9E] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#0070C0]">
                        <span>Upload model file</span>
                        <input
                          id="modelFile"
                          name="modelFile"
                          type="file"
                          className="sr-only"
                          accept=".pkl,.joblib,.h5,.onnx,.pt,.sav"
                          onChange={handleModelFileUpload}
                          required
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                      <p className="text-xs text-gray-500">PKL, JOBLIB, H5, ONNX, PT, SAV up to 50MB</p>
                    </div>
                  </div>
                  {modelFile && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-green-50 border border-green-200 rounded-md p-4 mt-4"
                    >
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-2 text-sm text-green-800">
                          {modelFile.name} uploaded successfully
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Dataset File Upload */}
                <div>
                  <label htmlFor="datasetFile" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Dataset File *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="space-y-2">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <label htmlFor="datasetFile" className="relative cursor-pointer bg-white rounded-md font-medium text-[#0070C0] hover:text-[#005A9E] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#0070C0]">
                        <span>Upload dataset file</span>
                        <input
                          id="datasetFile"
                          name="datasetFile"
                          type="file"
                          className="sr-only"
                          accept=".csv,.xlsx,.json,.parquet"
                          onChange={handleDatasetFileUpload}
                          required
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                      <p className="text-xs text-gray-500">CSV, XLSX, JSON, Parquet up to 100MB</p>
                    </div>
                  </div>
                  {datasetFile && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-green-50 border border-green-200 rounded-md p-4 mt-4"
                    >
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-2 text-sm text-green-800">
                          {datasetFile.name} uploaded successfully
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Selection Criteria */}
                <div>
                  <label htmlFor="selectionCriteria" className="block text-sm font-medium text-gray-700 mb-2">
                    Selection Criteria *
                  </label>
                  <textarea
                    id="selectionCriteria"
                    rows={4}
                    required
                    value={selectionCriteria}
                    onChange={(e) => setSelectionCriteria(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0]"
                    placeholder="Describe the criteria used for selecting candidates (e.g., minimum experience, required skills, education level, etc.)"
                  />
                </div>

                {/* Intentional Bias Features */}
                <div>
                  <label htmlFor="intentionalBias" className="block text-sm font-medium text-gray-700 mb-2">
                    Intentional Bias Features
                  </label>
                  <textarea
                    id="intentionalBias"
                    rows={3}
                    value={intentionalBias}
                    onChange={(e) => setIntentionalBias(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0]"
                    placeholder="Describe any intentional bias features or diversity goals (e.g., gender balance targets, age group preferences, etc.)"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This helps us understand your diversity goals and evaluate alignment
                  </p>
                </div>

                {/* Certification Type */}
                <div>
                  <label htmlFor="certificationType" className="block text-sm font-medium text-gray-700 mb-2">
                    Certification Type
                  </label>
                  <select
                    id="certificationType"
                    value={certificationType}
                    onChange={(e) => setCertificationType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0]"
                  >
                    <option value="">Select certification type</option>
                    <option value="1">Standard Fairness Certification</option>
                    <option value="2">Advanced Bias Analysis</option>
                    <option value="3">Comprehensive Diversity Audit</option>
                  </select>
                </div>

                {/* Error/Success Messages */}
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

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => router.push(`/models/${modelId}`)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <div className="flex space-x-4">
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
                        "Create Version"
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleCertifyModel}
                      disabled={isLoading}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Certify Model
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
} 