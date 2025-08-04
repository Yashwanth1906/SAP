"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiService } from "@/lib/api";
import CertificateTemplate from "@/components/CertificateTemplate";
import { downloadCertificate } from "@/lib/certificateUtils";

type Model = {
  id: string;
  name: string;
  type: string;
  description?: string;
  created_at?: string;
  certificationStatus: string;
  certificationDate?: string;
  fairnessScore?: number;
  certificateUrl?: string;
  version?: {
    id: string;
    name: string;
    created_at: string;
  };
  report?: {
    fairnessScore?: number;
    biasFeature?: string;
    intentionalBias?: string;
  };
  certificationType?: {
    name: string;
    description?: string;
  };
};

type Company = {
  id: string;
  name: string;
  city: string;
  country: string;
  description?: string;
};

export default function CompanyModelsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getCompany(id as string)
      .then(data => setCompany(data))
      .catch(error => {
        console.error("Error fetching company:", error);
        router.push("/companies");
      });

    apiService.getCompanyModels(id as string)
      .then(data => {
        setModels(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching models:", error);
        setLoading(false);
      });
  }, [id, router]);

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'certified':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0070C0] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading models...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Company not found</h2>
          <Link href="/companies" className="text-[#0070C0] hover:underline">
            Back to companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#0070C0] rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">BC</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">BiasCertify</span>
            </Link>
            
            <div className="flex space-x-4">
              <Link href="/" className="text-gray-700 hover:text-[#0070C0] transition-colors font-medium">
                Home
              </Link>
              <Link href="/companies" className="text-gray-700 hover:text-[#0070C0] transition-colors font-medium">
                Companies
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <div className="flex items-center mb-4">
              <Link href="/companies" className="text-[#0070C0] hover:underline mr-4">
                ← Back to Companies
              </Link>
            </div>
            
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-[#0070C0] rounded flex items-center justify-center mr-6">
                <span className="text-white font-bold text-xl">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-lg text-gray-600">{company.city}, {company.country}</p>
                {company.description && (
                  <p className="text-gray-600 mt-2">{company.description}</p>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Certified AI Models</h2>
              <p className="text-gray-600">
                This company has certified {models.length} AI hiring model{models.length !== 1 ? 's' : ''} for fairness and bias evaluation.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {models.length === 0 ? (
            <motion.div 
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No models found</h3>
              <p className="text-gray-600">This company hasn't certified any models yet.</p>
            </motion.div>
          ) : (
            <motion.div 
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {models.map((model) => (
                <motion.div 
                  key={model.id}
                  variants={fadeInUp}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{model.name}</h3>
                        {model.description && (
                          <p className="text-gray-600 text-sm mb-3">{model.description}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(model.certificationStatus)}`}>
                        {model.certificationStatus}
                      </span>
                    </div>

                    {model.report && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Report Details</h4>
                          <div className="text-xs text-gray-600 space-y-1">
                            {model.report.fairnessScore !== undefined && model.report.fairnessScore !== null && !isNaN(Number(model.report.fairnessScore)) && (
                              <p><strong>Fairness Score:</strong> {(Number(model.report.fairnessScore) * 100).toFixed(1)}%</p>
                            )}
                            {model.report.biasFeature && (
                              <p><strong>Bias Feature:</strong> {model.report.biasFeature}</p>
                            )}
                            {model.report.intentionalBias && (
                              <p><strong>Intentional Bias:</strong> {model.report.intentionalBias}</p>
                            )}
                          </div>
                        </div>
                      )}

                     {model.version && (
                       <div className="mb-4">
                         <h4 className="text-sm font-medium text-gray-900 mb-2">Version Information</h4>
                         <div className="text-xs text-gray-600">
                           <p><strong>Version:</strong> {model.version.name}</p>
                           <p><strong>Created:</strong> {model.version.created_at ? new Date(model.version.created_at).toLocaleDateString() : 'N/A'}</p>
                         </div>
                       </div>
                     )}

                     

                     {model.certificationType && (
                       <div className="mb-4">
                         <h4 className="text-sm font-medium text-gray-900 mb-2">Certification Type</h4>
                         <div className="text-xs text-gray-600 space-y-1">
                                                       <p><strong>Type:</strong> {model.certificationType.name}</p>
                            {model.certificationType.description && (
                              <p><strong>Description:</strong> {model.certificationType.description}</p>
                            )}
                         </div>
                       </div>
                     )}

                    <div className="mb-4">
                      <CertificateTemplate
                        organizationName={company?.name || 'Unknown Organization'}
                        modelName={model.name}
                        versionName={model.version?.name || 'Unknown Version'}
                        modelDescription={model.description}
                        fairnessScore={model.report?.fairnessScore}
                        intentionalBias={model.report?.intentionalBias}
                        certificationDate={model.certificationDate}
                        certificateType={model.certificationType?.name}
                        modelId={model.id}
                        onDownload={() => {
                          const certificateElement = document.querySelector(`[data-certificate-${model.id}]`) as HTMLDivElement;
                          if (certificateElement) {
                            downloadCertificate(
                              { current: certificateElement } as React.RefObject<HTMLDivElement>,
                              `${model.name}_${model.version?.name || 'certificate'}`
                            );
                          }
                        }}
                      />
                    </div>
                        
                    <div className="text-xs text-gray-500">
                      {model.certificationDate && (
                        <p>Certified on: {new Date(model.certificationDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
} 