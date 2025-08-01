"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";

interface ModelAnalysis {
  fairnessMetrics: {
    demographicParity: number;
    equalOpportunity: number;
    tprDiff: number;
    fprDiff: number;
    averageOdds: number;
    fairnessScore: number;
  };
  intentionAlignment: {
    declared: Record<string, number>;
    actual: Record<string, number>;
    alignmentScore: number;
  };
  finalBiasScore: number;
  certificationStatus: "Fair" | "Not Fair" | "Partially Fair";
  explanation: string;
  recommendations: string[];
}

const demoSensitiveAttributes = [
  { name: "gender", values: ["Male", "Female", "Other"] },
  { name: "ethnicity", values: ["White", "Black", "Asian", "Other"] },
];

export default function ModelUploadPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = auth.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const [uploadedModel, setUploadedModel] = useState<File | null>(null);
  const [modelType, setModelType] = useState("Random Forest");
  const [targetVariable, setTargetVariable] = useState("selected");
  const [qualificationRule, setQualificationRule] = useState("min experience = 3, skills = Python");
  const [declaredGoals, setDeclaredGoals] = useState({ Female: 0.6, Male: 0.4 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<ModelAnalysis | null>(null);

  const handleModelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedModel(file);
    }
  };

  const handleAnalyzeModel = async () => {
    setIsAnalyzing(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    // Hardcoded analysis results for demo
    setAnalysisResults({
      fairnessMetrics: {
        demographicParity: 0.04,
        equalOpportunity: 0.03,
        tprDiff: 0.02,
        fprDiff: 0.01,
        averageOdds: 0.025,
        fairnessScore: 0.94,
      },
      intentionAlignment: {
        declared: { Female: 0.6, Male: 0.4 },
        actual: { Female: 0.58, Male: 0.42 },
        alignmentScore: 0.98,
      },
      finalBiasScore: 0.92,
      certificationStatus: "Fair",
      explanation: "Gender contributed 12% to decision differences in low-experience profiles (LIME/SHAP demo explanation).",
      recommendations: [
        "Continue monitoring model for fairness as new data is collected.",
        "Consider further balancing training data for age groups.",
        "Review qualification rules for potential indirect bias."
      ]
    });
    setIsAnalyzing(false);
  };

  // API endpoint (commented for now)
  /*
  const analyzeModelAPI = async (file: File, meta: any) => {
    const formData = new FormData();
    formData.append('model', file);
    formData.append('meta', JSON.stringify(meta));
    const response = await fetch('/api/analyze-model', {
      method: 'POST',
      body: formData
    });
    return response.json();
  };
  */

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
              <Link href="/dashboard" className="text-[#0070C0] hover:text-[#005A9E] text-sm">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload & Evaluate Model</h1>
          <p className="text-gray-600">Upload your trained ML model to evaluate fairness, bias, and alignment with your diversity goals.</p>
        </motion.div>

        {/* Model Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Model</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
            <div className="space-y-2">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <label htmlFor="model-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-[#0070C0] hover:text-[#005A9E] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#0070C0]">
                <span>Upload a model file</span>
                <input
                  id="model-upload"
                  name="model-upload"
                  type="file"
                  className="sr-only"
                  accept=".pkl,.joblib,.h5,.onnx,.pt,.sav"
                  onChange={handleModelUpload}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
              <p className="text-xs text-gray-500">PKL, JOBLIB, H5, ONNX, PT, SAV up to 50MB</p>
            </div>
            {uploadedModel && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-green-50 border border-green-200 rounded-md p-4 mt-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-2 text-sm text-green-800">{uploadedModel.name} uploaded successfully</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Model Metadata & Parameters */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Type</label>
              <select value={modelType} onChange={e => setModelType(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-[#0070C0] focus:border-[#0070C0]">
                <option>Random Forest</option>
                <option>XGBoost</option>
                <option>Logistic Regression</option>
                <option>Neural Network</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Variable</label>
              <input value={targetVariable} onChange={e => setTargetVariable(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-[#0070C0] focus:border-[#0070C0]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qualification Rules</label>
              <input value={qualificationRule} onChange={e => setQualificationRule(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-[#0070C0] focus:border-[#0070C0]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Declared Diversity Goals</label>
              <div className="flex gap-2">
                <input type="number" min={0} max={1} step={0.01} value={declaredGoals.Female} onChange={e => setDeclaredGoals({ ...declaredGoals, Female: parseFloat(e.target.value) })} className="w-24 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-[#0070C0] focus:border-[#0070C0]" />
                <span className="text-sm text-gray-700">Female</span>
                <input type="number" min={0} max={1} step={0.01} value={declaredGoals.Male} onChange={e => setDeclaredGoals({ ...declaredGoals, Male: parseFloat(e.target.value) })} className="w-24 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-[#0070C0] focus:border-[#0070C0]" />
                <span className="text-sm text-gray-700">Male</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Sum should be 1.0</p>
            </div>
          </div>
        </div>

        {/* Sensitive Attributes Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sensitive Attributes</h2>
          <div className="flex flex-wrap gap-4">
            {demoSensitiveAttributes.map(attr => (
              <div key={attr.name} className="border border-gray-200 rounded-lg p-4 min-w-[140px]">
                <h3 className="font-medium text-gray-900 capitalize mb-2">{attr.name}</h3>
                <div className="flex flex-wrap gap-1">
                  {attr.values.map((v, i) => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{v}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={handleAnalyzeModel}
            disabled={!uploadedModel || isAnalyzing}
            className="bg-[#0070C0] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#005A9E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Evaluating Model...
              </div>
            ) : (
              "Evaluate Model"
            )}
          </button>
          
          <button
            onClick={() => router.push("/upload/ai-assistant")}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Assistant for your upload</span>
          </button>
        </div>

        {/* Results Section */}
        {analysisResults && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Fairness Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Fairness Metrics</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">DPD</div>
                  <div className="text-2xl font-bold text-blue-900">{(analysisResults.fairnessMetrics.demographicParity * 100).toFixed(1)}%</div>
                  <div className="text-sm text-blue-800">Demographic Parity Diff</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-green-600">EOD</div>
                  <div className="text-2xl font-bold text-green-900">{(analysisResults.fairnessMetrics.equalOpportunity * 100).toFixed(1)}%</div>
                  <div className="text-sm text-green-800">Equal Opportunity Diff</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">AOD</div>
                  <div className="text-2xl font-bold text-purple-900">{(analysisResults.fairnessMetrics.averageOdds * 100).toFixed(1)}%</div>
                  <div className="text-sm text-purple-800">Average Odds Diff</div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">TPR Diff</div>
                  <div className="text-2xl font-bold text-yellow-900">{(analysisResults.fairnessMetrics.tprDiff * 100).toFixed(1)}%</div>
                  <div className="text-sm text-yellow-800">True Positive Rate Diff</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-red-600">FPR Diff</div>
                  <div className="text-2xl font-bold text-red-900">{(analysisResults.fairnessMetrics.fprDiff * 100).toFixed(1)}%</div>
                  <div className="text-sm text-red-800">False Positive Rate Diff</div>
                </div>
              </div>
              <div className="mt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#0070C0]">{(analysisResults.fairnessMetrics.fairnessScore * 100).toFixed(0)}%</div>
                  <div className="text-sm text-gray-600 mt-1">Overall Fairness Score</div>
                </div>
              </div>
            </div>

            {/* Intention Alignment */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Intention Alignment</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Declared Distribution</h3>
                  <div className="flex gap-4">
                    {Object.entries(analysisResults.intentionAlignment.declared).map(([group, value]) => (
                      <div key={group} className="bg-blue-50 px-4 py-2 rounded-lg text-center">
                        <div className="text-lg font-bold text-blue-600">{(value * 100).toFixed(0)}%</div>
                        <div className="text-xs text-blue-800">{group}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Actual Model Output</h3>
                  <div className="flex gap-4">
                    {Object.entries(analysisResults.intentionAlignment.actual).map(([group, value]) => (
                      <div key={group} className="bg-green-50 px-4 py-2 rounded-lg text-center">
                        <div className="text-lg font-bold text-green-600">{(value * 100).toFixed(0)}%</div>
                        <div className="text-xs text-green-800">{group}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <div className="text-4xl font-bold text-[#0070C0]">{(analysisResults.intentionAlignment.alignmentScore * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-600 mt-1">Alignment Score</div>
              </div>
            </div>

            {/* Final Bias Score & Certification */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Certification</h2>
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bold mb-2 {analysisResults.finalBiasScore >= 0.85 ? 'text-green-600' : 'text-red-600'}">
                  {(analysisResults.finalBiasScore * 100).toFixed(0)}
                  <span className="text-2xl align-super">%</span>
                </div>
                <div className={`text-lg font-semibold ${analysisResults.finalBiasScore >= 0.85 ? 'text-green-600' : analysisResults.finalBiasScore >= 0.7 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {analysisResults.certificationStatus}
                </div>
                <div className="text-sm text-gray-600 mt-1">Final Bias Score</div>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Model Explanation (LIME/SHAP)</h2>
              <div className="text-gray-700 text-sm mb-2">{analysisResults.explanation}</div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h2>
              <div className="space-y-3">
                {analysisResults.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <svg className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-gray-700">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
    </AuthGuard>
  );
} 