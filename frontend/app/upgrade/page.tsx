"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { auth } from "@/lib/auth";
import { apiService } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  popular?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 0,
    interval: "month",
    features: [
      "Up to 5 AI models",
      "Basic bias analysis",
      "Standard reports",
      "Email support"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    price: 999,
    interval: "month",
    popular: true,
    features: [
      "Unlimited AI models",
      "Advanced bias analysis",
      "GitHub integration",
      "AI Assistant (LLM-powered)",
      "Continuous monitoring",
      "Webhook triggers",
      "Priority support",
      "Custom certifications"
    ]
  }
];

export default function UpgradePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = auth.getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setCurrentUser(user);
    
    if (user.is_premium) {
      router.push("/dashboard");
    }
            
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [router]);

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setError("");
  };

  const handleUpgrade = async () => {
    if (!selectedPlan || selectedPlan.price === 0) {
      setError("Please select a paid plan to upgrade.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const orderResponse = await apiService.createOrder({
        planId: selectedPlan.id,
        organizationId: currentUser.id,
        planName: selectedPlan.name,
        price: selectedPlan.price
      });

      const options = {
        key: orderResponse.keyId,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: "SAP FairCert",
        description: `${selectedPlan.name} Plan Subscription`,
        order_id: orderResponse.orderId,
        handler: async function (response: any) {
          try {
            await apiService.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              organizationId: currentUser.id,
              planId: selectedPlan.id,
              planName: selectedPlan.name
            });

            auth.login({
              ...currentUser,
              is_premium: true,
            });

            router.push('/dashboard?success=true');
          } catch (error: any) {
            const errorMessage = error.response?.data?.detail;
            setError(typeof errorMessage === 'string' ? errorMessage : "Payment verification failed. Please try again.");
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
        },
        theme: {
          color: "#0070C0"
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      const errorMessage = error.response?.data?.detail;
      setError(typeof errorMessage === 'string' ? errorMessage : "Failed to create order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

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
                <span className="text-sm text-gray-700">Welcome, {currentUser.name}</span>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors text-sm"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Upgrade to Premium</h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Unlock advanced features including GitHub integration, AI assistant, and continuous bias monitoring.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-lg shadow-lg border-2 transition-all duration-200 ${
                    selectedPlan?.id === plan.id
                      ? 'border-[#0070C0] shadow-xl scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${plan.popular ? 'ring-2 ring-yellow-400' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-gray-900">₹{plan.price}</span>
                        <span className="text-gray-500">/{plan.interval}</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePlanSelect(plan)}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        selectedPlan?.id === plan.id
                          ? 'bg-[#0070C0] text-white'
                          : plan.popular
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selectedPlan?.id === plan.id ? 'Selected' : plan.price === 0 ? 'Current Plan' : 'Select Plan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedPlan && selectedPlan.price > 0 && (
              <div className="text-center">
                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#0070C0] to-[#005A9E] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-[#005A9E] hover:to-[#004080] transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    `Upgrade to ${selectedPlan.name} - ₹${selectedPlan.price}/${selectedPlan.interval}`
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-2">Secure payment powered by Razorpay</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
} 