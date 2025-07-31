"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(auth.isAuthenticated());
  }, []);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-[#0070C0] rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">BC</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">BiasCertify</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:flex space-x-8"
            >
              <a href="#features" className="text-gray-700 hover:text-[#0070C0] transition-colors font-medium">Features</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-[#0070C0] transition-colors font-medium">How it Works</a>
              <a href="#pricing" className="text-gray-700 hover:text-[#0070C0] transition-colors font-medium">Pricing</a>
              {isAuthenticated ? (
                <Link href="/dashboard" className="bg-[#0070C0] text-white px-6 py-2 rounded hover:bg-[#005A9E] transition-colors font-medium">
                  Dashboard
                </Link>
              ) : (
                <Link href="/login" className="bg-[#0070C0] text-white px-6 py-2 rounded hover:bg-[#005A9E] transition-colors font-medium">
                  Sign In
                </Link>
              )}
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <motion.h1 
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
            >
              AI Fairness
              <span className="text-[#0070C0]"> Certification</span>
              <br />
              for Hiring
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
            >
              Automatically evaluate and certify your hiring AI models for bias, fairness, and alignment with your diversity goals. 
              Build trust with transparent, auditable AI decisions.
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button className="bg-[#0070C0] text-white px-8 py-4 rounded text-lg font-semibold hover:bg-[#005A9E] transition-all transform hover:scale-105">
                Start Free Trial
              </button>
              <button className="border-2 border-[#0070C0] text-[#0070C0] px-8 py-4 rounded text-lg font-semibold hover:bg-gray-50 transition-all">
                Watch Demo
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Bias Evaluation
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our three-stage pipeline ensures your AI hiring models are fair, unbiased, and aligned with your diversity objectives.
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid md:grid-cols-3 gap-8"
          >
            {/* Feature 1 */}
            <motion.div 
              variants={fadeInUp}
              className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-[#0070C0] rounded flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Dataset Fairness Analysis</h3>
              <p className="text-gray-600">
                Analyze your training data for existing biases, identify imbalances across demographic groups, and flag potential data collection issues.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              variants={fadeInUp}
              className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-[#0070C0] rounded flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Model Fairness Testing</h3>
              <p className="text-gray-600">
                Comprehensive evaluation using synthetic balanced datasets and industry-standard fairness metrics including DPD, EOD, and AOD.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              variants={fadeInUp}
              className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-[#0070C0] rounded flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Intention Alignment</h3>
              <p className="text-gray-600">
                Verify that your model outputs align with declared diversity goals and provide actionable insights for improvement.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple three-step process to certify your AI hiring models for fairness and bias.
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid md:grid-cols-3 gap-8"
          >
            {/* Step 1 */}
            <motion.div variants={fadeInUp} className="text-center">
              <div className="w-16 h-16 bg-[#0070C0] rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Upload Your Model</h3>
              <p className="text-gray-600">
                Upload your trained ML model, specify sensitive attributes, and define your qualification criteria.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={fadeInUp} className="text-center">
              <div className="w-16 h-16 bg-[#0070C0] rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Automated Analysis</h3>
              <p className="text-gray-600">
                Our pipeline runs comprehensive fairness tests, evaluates bias metrics, and checks intention alignment.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={fadeInUp} className="text-center">
              <div className="w-16 h-16 bg-[#0070C0] rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Get Certification</h3>
              <p className="text-gray-600">
                Receive detailed reports, fairness scores, and certification status with improvement recommendations.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Fairness Metrics We Evaluate
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Industry-standard metrics to ensure comprehensive bias evaluation and transparency.
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { name: "Demographic Parity", value: "DPD", desc: "Equal selection rates across groups" },
              { name: "Equal Opportunity", value: "EOD", desc: "Equal true positive rates" },
              { name: "Average Odds", value: "AOD", desc: "Balanced false positive/negative rates" },
              { name: "Intention Alignment", value: "IA", desc: "Model vs declared diversity goals" }
            ].map((metric, index) => (
              <motion.div 
                key={metric.name}
                variants={fadeInUp}
                className="bg-gray-50 p-6 rounded-xl border border-gray-200"
              >
                <div className="text-2xl font-bold text-[#0070C0] mb-2">{metric.value}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{metric.name}</h3>
                <p className="text-sm text-gray-600">{metric.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0070C0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Certify Your AI?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join leading companies in building trust with fair, transparent AI hiring systems.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-[#0070C0] px-8 py-4 rounded text-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105">
                Start Free Trial
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded text-lg font-semibold hover:bg-white hover:text-[#0070C0] transition-all">
                Schedule Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                              <div className="w-8 h-8 bg-[#0070C0] rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">BC</span>
              </div>
                <span className="text-xl font-semibold">BiasCertify</span>
              </div>
              <p className="text-gray-400">
                Building trust in AI through comprehensive bias certification and fairness evaluation.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 BiasCertify. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
