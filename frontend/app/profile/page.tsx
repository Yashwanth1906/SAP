"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { auth } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";

interface CompanyProfile {
  companyName: string;
  industry: string;
  size: string;
  website: string;
  contactEmail: string;
  logoUrl?: string;
  adminName: string;
  adminEmail: string;
  phone?: string;
  diversityGoals: {
    [group: string]: number;
  };
}

const initialProfile: CompanyProfile = {
  companyName: "Acme Corp",
  industry: "Technology",
  size: "201-500 employees",
  website: "https://acme.com",
  contactEmail: "hr@acme.com",
  logoUrl: undefined,
  adminName: "Jane Doe",
  adminEmail: "jane.doe@acme.com",
  phone: "+1 555-123-4567",
  diversityGoals: {
    Female: 0.5,
    Male: 0.5,
    Asian: 0.2,
    Black: 0.1,
    Hispanic: 0.1,
    White: 0.5,
  },
};

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(profile.logoUrl);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = auth.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const handleInput = (field: keyof CompanyProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleDiversityGoal = (group: string, value: number) => {
    setProfile((prev) => ({
      ...prev,
      diversityGoals: { ...prev.diversityGoals, [group]: value },
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
      // In real app, upload to server here
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));
    setEditing(false);
    setSaving(false);
    // API call example (commented):
    // await fetch('/api/company-profile', { method: 'POST', body: JSON.stringify(profile) });
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Profile</h1>
          <p className="text-gray-600">Manage your company information, admin contact, and diversity goals.</p>
        </motion.div>

        {/* Company Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Company Logo" className="object-cover w-full h-full" />
              ) : (
                <span className="text-3xl text-gray-400 font-bold">{profile.companyName[0]}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <input
                    className="text-2xl font-bold text-gray-900 border-b border-gray-200 focus:outline-none focus:border-[#0070C0]"
                    value={profile.companyName}
                    onChange={e => handleInput("companyName", e.target.value)}
                  />
                ) : (
                  <span className="text-2xl font-bold text-gray-900">{profile.companyName}</span>
                )}
                {editing && (
                  <label className="ml-4 cursor-pointer text-xs text-[#0070C0] hover:underline">
                    Change Logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                )}
              </div>
              <div className="text-gray-500 text-sm mt-1">{profile.industry}</div>
              <div className="text-gray-500 text-sm">{profile.size}</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Website</label>
              {editing ? (
                <input className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#0070C0]" value={profile.website} onChange={e => handleInput("website", e.target.value)} />
              ) : (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-[#0070C0] hover:underline">{profile.website}</a>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contact Email</label>
              {editing ? (
                <input className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#0070C0]" value={profile.contactEmail} onChange={e => handleInput("contactEmail", e.target.value)} />
              ) : (
                <span>{profile.contactEmail}</span>
              )}
            </div>
          </div>
        </div>

        {/* Admin Contact Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Contact</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Admin Name</label>
              {editing ? (
                <input className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#0070C0]" value={profile.adminName} onChange={e => handleInput("adminName", e.target.value)} />
              ) : (
                <span>{profile.adminName}</span>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Admin Email</label>
              {editing ? (
                <input className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#0070C0]" value={profile.adminEmail} onChange={e => handleInput("adminEmail", e.target.value)} />
              ) : (
                <span>{profile.adminEmail}</span>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              {editing ? (
                <input className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#0070C0]" value={profile.phone || ""} onChange={e => handleInput("phone", e.target.value)} />
              ) : (
                <span>{profile.phone}</span>
              )}
            </div>
          </div>
        </div>

        {/* Diversity Goals Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Diversity Goals</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(profile.diversityGoals).map(([group, value]) => (
              <div key={group} className="flex flex-col items-center">
                <span className="text-sm text-gray-700 mb-1">{group}</span>
                {editing ? (
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={value}
                    onChange={e => handleDiversityGoal(group, parseFloat(e.target.value))}
                    className="w-20 border border-gray-200 rounded px-2 py-1 text-center focus:outline-none focus:border-[#0070C0]"
                  />
                ) : (
                  <span className="text-lg font-bold text-[#0070C0]">{(value * 100).toFixed(0)}%</span>
                )}
              </div>
            ))}
          </div>
          {editing && (
            <p className="text-xs text-gray-500 mt-2">Sum should be 1.0</p>
          )}
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>
          <div className="flex flex-col gap-2">
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors text-sm mb-2" disabled>
              Change Password (coming soon)
            </button>
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors text-sm" disabled>
              Manage API Keys (coming soon)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded hover:bg-gray-200 transition-colors font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-[#0070C0] text-white px-6 py-2 rounded hover:bg-[#005A9E] transition-colors font-medium disabled:opacity-50"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="bg-[#0070C0] text-white px-6 py-2 rounded hover:bg-[#005A9E] transition-colors font-medium"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}