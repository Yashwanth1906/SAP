"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { auth } from "@/lib/auth";
import { apiService } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

interface SelectionCriteriaField {
  feature: string;
  value: string;
}

interface IntentionalBiasFeature {
  feature: string;
  isSelected: boolean;
}

export default function CreateVersionPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params.id as string;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [model, setModel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [versionName, setVersionName] = useState("");
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectionCriteriaFields, setSelectionCriteriaFields] = useState<SelectionCriteriaField[]>([]);
  const [intentionalBiasFeatures, setIntentionalBiasFeatures] = useState<IntentionalBiasFeature[]>([]);
  const [showCriteriaSections, setShowCriteriaSections] = useState(false);

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

  const parseCSVHeaders = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const firstLine = lines[0];
          const headers = firstLine.split(',').map(header => header.trim().replace(/"/g, ''));
          resolve(headers);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleModelFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setModelFile(file);
    }
  };

  const handleDatasetFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDatasetFile(file);
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        try {
          const headers = await parseCSVHeaders(file);
          setCsvHeaders(headers);
          
          const initialSelectionFields = headers.map(header => ({
            feature: header,
            value: ""
          }));
          setSelectionCriteriaFields(initialSelectionFields);
          
          const initialBiasFeatures = headers.map(header => ({
            feature: header,
            isSelected: false
          }));
          setIntentionalBiasFeatures(initialBiasFeatures);
          
          setShowCriteriaSections(true);
        } catch (error) {
          setError('Failed to parse CSV file. Please ensure it\'s a valid CSV file.');
          console.error('Error parsing CSV:', error);
        }
      } else {
        setCsvHeaders([]);
        setSelectionCriteriaFields([]);
        setIntentionalBiasFeatures([]);
        setShowCriteriaSections(true);
      }
    }
  };

  const handleReuploadDataset = () => {
    setDatasetFile(null);
    setCsvHeaders([]);
    setSelectionCriteriaFields([]);
    setIntentionalBiasFeatures([]);
    setShowCriteriaSections(false);
  };

  const updateSelectionCriteriaField = (index: number, value: string) => {
    const updatedFields = [...selectionCriteriaFields];
    updatedFields[index].value = value;
    setSelectionCriteriaFields(updatedFields);
  };

  const removeSelectionCriteriaField = (index: number) => {
    const updatedFields = selectionCriteriaFields.filter((_, i) => i !== index);
    setSelectionCriteriaFields(updatedFields);
  };

  const toggleIntentionalBiasFeature = (index: number) => {
    const updatedFeatures = [...intentionalBiasFeatures];
    updatedFeatures[index].isSelected = !updatedFeatures[index].isSelected;
    setIntentionalBiasFeatures(updatedFeatures);
  };

  const handleCertifyModel = async () => {
    try {
      setIsLoading(true);
      setError("");
      setSuccess("Certifying...");

      if (!modelFile) {
        setError("Please upload a model file");
        return;
      }

      if (!datasetFile) {
        setError("Please upload a dataset file");
        return;
      }

      if (!versionName.trim()) {
        setError("Please enter a version name");
        return;
      }

      const selectionCriteriaData: { [key: string]: string } = {};
      selectionCriteriaFields.forEach(field => {
        if (field.value.trim()) {
          selectionCriteriaData[field.feature] = field.value;
        }
      });

      const selectedBiasFeatures = intentionalBiasFeatures
        .filter(feature => feature.isSelected)
        .map(feature => feature.feature);

      await apiService.certifyModel(
        parseInt(modelId),
        modelFile,
        datasetFile,
        versionName,
        JSON.stringify(selectionCriteriaData),
        JSON.stringify(selectedBiasFeatures)
      );
      
      setSuccess("Model certification completed successfully!");
      
      setTimeout(() => {
        router.push(`/models/${modelId}`);
      }, 2000);

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

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Version</h1>
              <p className="text-gray-600 mt-1">
                Create a new version for model: <span className="font-semibold">{model.name}</span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <form className="space-y-6">
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

                {!datasetFile ? (
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
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dataset File
                    </label>
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="ml-2 text-sm text-green-800">
                            {datasetFile.name} uploaded successfully
                            {csvHeaders.length > 0 && (
                              <span className="block text-xs text-green-600 mt-1">
                                Detected {csvHeaders.length} features: {csvHeaders.join(', ')}
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleReuploadDataset}
                          className="text-sm text-[#0070C0] hover:text-[#005A9E] font-medium"
                        >
                          Reupload
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showCriteriaSections && csvHeaders.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selection Criteria *
                    </label>
                    <div className="space-y-3">
                      {selectionCriteriaFields.map((field, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center space-x-3"
                        >
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {field.feature}
                            </label>
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => updateSelectionCriteriaField(index, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0] text-sm"
                              placeholder={`Enter criteria for ${field.feature}`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectionCriteriaField(index)}
                            className="mt-6 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove this feature"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Define selection criteria for each feature. Leave empty to skip a feature.
                    </p>
                  </div>
                )}

                {showCriteriaSections && csvHeaders.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Intentional Bias Features
                    </label>
                    <div className="space-y-2">
                      {intentionalBiasFeatures.map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center space-x-3"
                        >
                          <input
                            type="checkbox"
                            id={`bias-${index}`}
                            checked={feature.isSelected}
                            onChange={() => toggleIntentionalBiasFeature(index)}
                            className="h-4 w-4 text-[#0070C0] focus:ring-[#0070C0] border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`bias-${index}`}
                            className="text-sm text-gray-700 cursor-pointer"
                          >
                            {feature.feature}
                          </label>
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Select features that represent intentional bias or diversity goals.
                    </p>
                  </div>
                )}
          
                {showCriteriaSections && csvHeaders.length === 0 && (
                  <>
                    <div>
                      <label htmlFor="selectionCriteria" className="block text-sm font-medium text-gray-700 mb-2">
                        Selection Criteria *
                      </label>
                      <textarea
                        id="selectionCriteria"
                        rows={4}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0]"
                        placeholder="Describe the criteria used for selecting candidates (e.g., minimum experience, required skills, education level, etc.)"
                      />
                    </div>

                    <div>
                      <label htmlFor="intentionalBias" className="block text-sm font-medium text-gray-700 mb-2">
                        Intentional Bias Features
                      </label>
                      <textarea
                        id="intentionalBias"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0070C0] focus:border-[#0070C0]"
                        placeholder="Describe any intentional bias features or diversity goals (e.g., gender balance targets, age group preferences, etc.)"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        This helps us understand your diversity goals and evaluate alignment
                      </p>
                    </div>
                  </>
                )}

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

                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => router.push(`/models/${modelId}`)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCertifyModel}
                    disabled={isLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Certifying...
                      </div>
                    ) : (
                      "Certify Model"
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