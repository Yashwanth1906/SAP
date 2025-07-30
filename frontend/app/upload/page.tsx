"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface SensitiveAttribute {
  name: string;
  type: "categorical" | "numerical";
  values?: string[];
  description: string;
}

interface DatasetAnalysis {
  totalRecords: number;
  qualifiedRecords: number;
  unqualifiedRecords: number;
  sensitiveGroups: {
    [key: string]: {
      total: number;
      qualified: number;
      unqualified: number;
      qualifiedPercentage: number;
    };
  };
  biasIndicators: {
    demographicParity: number;
    equalOpportunity: number;
    statisticalParity: number;
    overallBiasScore: number;
  };
  recommendations: string[];
}

export default function UploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"dataset" | "model">("dataset");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sensitiveAttributes, setSensitiveAttributes] = useState<SensitiveAttribute[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<DatasetAnalysis | null>(null);

  // Hardcoded sample data for demo
  const sampleSensitiveAttributes: SensitiveAttribute[] = [
    {
      name: "gender",
      type: "categorical",
      values: ["Male", "Female", "Other"],
      description: "Gender identity of the candidate"
    },
    {
      name: "age_group",
      type: "categorical", 
      values: ["18-25", "26-35", "36-45", "46-55", "55+"],
      description: "Age group of the candidate"
    },
    {
      name: "ethnicity",
      type: "categorical",
      values: ["White", "Black", "Hispanic", "Asian", "Other"],
      description: "Ethnic background of the candidate"
    },
    {
      name: "experience_years",
      type: "numerical",
      description: "Years of professional experience"
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Auto-populate sensitive attributes for demo
      setSensitiveAttributes(sampleSensitiveAttributes);
    }
  };

  const handleAnalyzeDataset = async () => {
    setIsAnalyzing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Hardcoded analysis results for demo
    const mockResults: DatasetAnalysis = {
      totalRecords: 15420,
      qualifiedRecords: 8234,
      unqualifiedRecords: 7186,
      sensitiveGroups: {
        gender: {
          total: 15420,
          qualified: 8234,
          unqualified: 7186,
          qualifiedPercentage: 53.4
        },
        "Male": {
          total: 8234,
          qualified: 4567,
          unqualified: 3667,
          qualifiedPercentage: 55.5
        },
        "Female": {
          total: 7186,
          qualified: 3667,
          unqualified: 3519,
          qualifiedPercentage: 51.0
        },
        "18-25": {
          total: 2159,
          qualified: 987,
          unqualified: 1172,
          qualifiedPercentage: 45.7
        },
        "26-35": {
          total: 4567,
          qualified: 2345,
          unqualified: 2222,
          qualifiedPercentage: 51.4
        },
        "36-45": {
          total: 4567,
          qualified: 2567,
          unqualified: 2000,
          qualifiedPercentage: 56.2
        },
        "46-55": {
          total: 3087,
          qualified: 1789,
          unqualified: 1298,
          qualifiedPercentage: 58.0
        },
        "55+": {
          total: 1040,
          qualified: 546,
          unqualified: 494,
          qualifiedPercentage: 52.5
        }
      },
      biasIndicators: {
        demographicParity: 0.045,
        equalOpportunity: 0.032,
        statisticalParity: 0.038,
        overallBiasScore: 0.72
      },
      recommendations: [
        "Consider collecting more data from underrepresented age groups (18-25)",
        "Gender distribution shows slight bias - review data collection methods",
        "Implement data augmentation for minority groups",
        "Consider using synthetic data to balance the dataset"
      ]
    };
    
    setAnalysisResults(mockResults);
    setAnalysisComplete(true);
    setIsAnalyzing(false);
  };

  // API endpoint (commented for now)
  /*
  const analyzeDatasetAPI = async (file: File, attributes: SensitiveAttribute[]) => {
    const formData = new FormData();
    formData.append('dataset', file);
    formData.append('sensitiveAttributes', JSON.stringify(attributes));
    
    const response = await fetch('/api/analyze-dataset', {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  };
  */

  return (
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
                Welcome, {session?.user?.name || session?.user?.email}
              </span>
              <Link href="/dashboard" className="text-[#0070C0] hover:text-[#005A9E] text-sm">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Upload & Analyze
          </h1>
          <p className="text-gray-600">
            Upload your dataset or model to evaluate fairness and bias
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("dataset")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "dataset"
                    ? "border-[#0070C0] text-[#0070C0]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Dataset Analysis
              </button>
              <button
                onClick={() => router.push("/upload/model")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "model"
                    ? "border-[#0070C0] text-[#0070C0]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Model Analysis
              </button>
            </nav>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "dataset" && (
            <motion.div
              key="dataset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* File Upload Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Upload Dataset
                </h2>
                
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <div className="space-y-2">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-[#0070C0] hover:text-[#005A9E] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#0070C0]">
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept=".csv,.xlsx,.json"
                            onChange={handleFileUpload}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">CSV, XLSX, or JSON up to 10MB</p>
                    </div>
                  </div>

                  {uploadedFile && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-green-50 border border-green-200 rounded-md p-4"
                    >
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-2 text-sm text-green-800">
                          {uploadedFile.name} uploaded successfully
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Sensitive Attributes Section */}
              {uploadedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Sensitive Attributes
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Select the attributes that should be analyzed for bias
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    {sensitiveAttributes.map((attr, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 capitalize">{attr.name}</h3>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {attr.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{attr.description}</p>
                        {attr.values && (
                          <div className="flex flex-wrap gap-1">
                            {attr.values.map((value, vIndex) => (
                              <span key={vIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Analysis Button */}
              {uploadedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <button
                    onClick={handleAnalyzeDataset}
                    disabled={isAnalyzing}
                    className="bg-[#0070C0] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#005A9E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing Dataset...
                      </div>
                    ) : (
                      "Analyze Dataset"
                    )}
                  </button>
                </motion.div>
              )}

              {/* Analysis Results */}
              {analysisComplete && analysisResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Dataset Overview */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Dataset Overview
                    </h2>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{analysisResults.totalRecords.toLocaleString()}</div>
                        <div className="text-sm text-blue-800">Total Records</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{analysisResults.qualifiedRecords.toLocaleString()}</div>
                        <div className="text-sm text-green-800">Qualified</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{analysisResults.unqualifiedRecords.toLocaleString()}</div>
                        <div className="text-sm text-red-800">Unqualified</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{(analysisResults.qualifiedRecords / analysisResults.totalRecords * 100).toFixed(1)}%</div>
                        <div className="text-sm text-purple-800">Qualification Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Bias Indicators */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Bias Indicators
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Fairness Metrics</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Demographic Parity</span>
                            <span className={`font-medium ${analysisResults.biasIndicators.demographicParity > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                              {(analysisResults.biasIndicators.demographicParity * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Equal Opportunity</span>
                            <span className={`font-medium ${analysisResults.biasIndicators.equalOpportunity > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                              {(analysisResults.biasIndicators.equalOpportunity * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Statistical Parity</span>
                            <span className={`font-medium ${analysisResults.biasIndicators.statisticalParity > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                              {(analysisResults.biasIndicators.statisticalParity * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Overall Bias Score</h3>
                        <div className="text-center">
                          <div className={`text-4xl font-bold ${analysisResults.biasIndicators.overallBiasScore > 0.7 ? 'text-green-600' : analysisResults.biasIndicators.overallBiasScore > 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {(analysisResults.biasIndicators.overallBiasScore * 100).toFixed(0)}%
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {analysisResults.biasIndicators.overallBiasScore > 0.7 ? 'Good' : analysisResults.biasIndicators.overallBiasScore > 0.5 ? 'Fair' : 'Needs Improvement'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group Analysis */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Group Analysis
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qualified</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qualification Rate</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.entries(analysisResults.sensitiveGroups).map(([group, data]) => (
                            <tr key={group}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{group}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.total.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.qualified.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm font-medium ${data.qualifiedPercentage < 50 ? 'text-red-600' : 'text-green-600'}`}>
                                  {data.qualifiedPercentage.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Recommendations
                    </h2>
                    <div className="space-y-3">
                      {analysisResults.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <svg className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm text-gray-700">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "model" && (
            <motion.div
              key="model"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center"
            >
              <div className="py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Model Analysis</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Model analysis features coming soon. Start with dataset analysis first.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 