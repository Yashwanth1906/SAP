"use client";

import { useRef } from 'react';
import { motion } from 'framer-motion';

interface CertificateTemplateProps {
  organizationName: string;
  modelName: string;
  versionName: string;
  modelDescription?: string;
  fairnessScore?: number;
  intentionalBias?: string;
  certificationDate?: string;
  certificateType?: string;
  modelId?: string;
  onDownload?: () => void;
}

export default function CertificateTemplate({
  organizationName,
  modelName,
  versionName,
  modelDescription,
  fairnessScore,
  intentionalBias,
  certificationDate,
  certificateType,
  modelId,
  onDownload
}: CertificateTemplateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const getCertificateType = () => {
    // If certificateType is provided from the backend, use it
    if (certificateType) {
      switch (certificateType) {
        case 'Intentional Bias':
          return {
            type: 'Intentional Bias',
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            description: 'This model has been identified with intentional bias and requires immediate attention.'
          };
        case 'Biased Certification':
          return {
            type: 'Biased Certification',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            description: 'This model shows significant bias and requires mitigation strategies.'
          };
        case 'Not Biased':
          return {
            type: 'Not Biased',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            description: 'This model has passed bias evaluation and is certified for fair use.'
          };
        default:
          break;
      }
    }
    
    // Fallback to calculated type based on fairness score and intentional bias
    if (intentionalBias && intentionalBias.trim() !== '') {
      return {
        type: 'Intentional Bias',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        description: 'This model has been identified with intentional bias and requires immediate attention.'
      };
    } else if (fairnessScore !== undefined && fairnessScore < 0.5) {
      return {
        type: 'Biased Certification',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        description: 'This model shows significant bias and requires mitigation strategies.'
      };
    } else {
      return {
        type: 'Not Biased',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        description: 'This model has passed bias evaluation and is certified for fair use.'
      };
    }
  };

  const certInfo = getCertificateType();

  const downloadCertificate = () => {
    if (certificateRef.current && onDownload) {
      onDownload();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Certification Certificate</h3>
        <button
          data-download-btn
          onClick={downloadCertificate}
          className="inline-flex items-center px-4 py-2 bg-[#0070C0] text-white rounded-lg hover:bg-[#005A9E] transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Certificate
        </button>
      </div>

             <motion.div
         ref={certificateRef}
         data-certificate={modelId}
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ duration: 0.5 }}
         className="bg-white border-2 border-gray-200 rounded-lg shadow-lg overflow-hidden"
         style={{ aspectRatio: '1.414' }} // A4 aspect ratio
       >
        {/* Certificate Header */}
        <div className="bg-gradient-to-r from-[#0070C0] to-[#005A9E] text-white p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mr-4">
              <span className="text-[#0070C0] font-bold text-2xl">SAP</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">BiasCertify</h1>
              <p className="text-lg opacity-90">AI Model Certification</p>
            </div>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Certificate of AI Model Certification</h2>
            <p className="text-gray-600">This is to certify that the following AI model has been evaluated for bias and fairness</p>
          </div>

          {/* Organization Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Organization</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xl font-medium text-[#0070C0]">{organizationName}</p>
            </div>
          </div>

          {/* Model Information */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Model Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Model Name:</label>
                  <p className="text-gray-900 font-medium">{modelName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Version:</label>
                  <p className="text-gray-900 font-medium">{versionName}</p>
                </div>
                {modelDescription && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description:</label>
                    <p className="text-gray-900 text-sm">{modelDescription}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Certification Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Certification Date:</label>
                  <p className="text-gray-900 font-medium">
                    {certificationDate ? new Date(certificationDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                {fairnessScore !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Fairness Score:</label>
                    <p className="text-gray-900 font-medium">{(fairnessScore * 100).toFixed(1)}%</p>
                  </div>
                )}
                {intentionalBias && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Intentional Bias:</label>
                    <p className="text-gray-900 text-sm">{intentionalBias}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Certification Type */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Certification Result</h3>
            <div className={`p-4 rounded-lg border-2 ${certInfo.borderColor} ${certInfo.bgColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-xl font-bold ${certInfo.color}`}>{certInfo.type}</h4>
                  <p className="text-gray-700 mt-1">{certInfo.description}</p>
                </div>
                <div className={`w-12 h-12 rounded-full ${certInfo.bgColor} flex items-center justify-center`}>
                  {certInfo.type === 'Not Biased' ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : certInfo.type === 'Intentional Bias' ? (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <p>Certificate ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                <p>Generated by BiasCertify System</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Powered by SAP</p>
                <p>© 2024 BiasCertify</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 