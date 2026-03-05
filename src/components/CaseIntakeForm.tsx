"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";

interface CaseData {
  id: string;
  caseNumber: number;
  country: string | null;
  gender: string | null;
  ageRange: string | null;
  problemDescription: string | null;
  xrayUrl: string | null;
}

interface CaseIntakeFormProps {
  conversationId: string;
  readOnly?: boolean;
}

const GENDERS = ["Male", "Female"];

const AGE_RANGES = ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"];

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Japan",
  "South Korea", "China", "Taiwan", "Hong Kong", "Singapore",
  "Thailand", "Vietnam", "Philippines", "India", "Germany",
  "France", "Italy", "Spain", "Brazil", "Mexico", "Other",
];

export default function CaseIntakeForm({ conversationId, readOnly }: CaseIntakeFormProps) {
  const t = useTranslations("case");
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [noCaseExists, setNoCaseExists] = useState(false);

  // Load existing case
  useEffect(() => {
    setNoCaseExists(false);
    fetch(`/api/cases?conversationId=${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.case) {
          setCaseData(data.case);
          // Collapse if case already has data
          if (data.case.country || data.case.ageRange || data.case.problemDescription) {
            setCollapsed(true);
          }
        } else {
          setNoCaseExists(true);
        }
      });
  }, [conversationId]);

  const saveCase = useCallback(
    async (updates: Partial<CaseData>) => {
      setSaving(true);
      setSaved(false);
      try {
        if (!caseData) {
          // Create new case
          const res = await fetch("/api/cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId, ...updates }),
          });
          if (res.ok) {
            const data = await res.json();
            setCaseData(data.case);
          }
        } else {
          // Update existing case
          const res = await fetch("/api/cases", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId, ...updates }),
          });
          if (res.ok) {
            const data = await res.json();
            setCaseData(data.case);
          }
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    },
    [caseData, conversationId]
  );

  const debouncedSave = useCallback(
    (updates: Partial<CaseData>) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveCase(updates), 800);
    },
    [saveCase]
  );

  const handleFieldChange = (field: string, value: string) => {
    setCaseData((prev) =>
      prev
        ? { ...prev, [field]: value }
        : ({ [field]: value } as unknown as CaseData)
    );
    debouncedSave({ [field]: value });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const { url } = await res.json();
        // Ensure case exists before updating xrayUrl
        if (!caseData) {
          await saveCase({ xrayUrl: url } as Partial<CaseData>);
        } else {
          await saveCase({ xrayUrl: url });
        }
      }
    } finally {
      setUploading(false);
    }
  };

  // Don't render for providers if no case exists
  if (readOnly && noCaseExists) return null;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t("title")}
          {caseData?.caseNumber && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              #{String(caseData.caseNumber).padStart(5, "0")}
            </span>
          )}
          {!readOnly && saving && <span className="text-xs text-teal-600">{t("saving")}</span>}
          {!readOnly && saved && <span className="text-xs text-green-600">{t("saved")}</span>}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {readOnly ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t("country")}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white px-3 py-2">
                    {caseData?.country || "--"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t("gender")}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white px-3 py-2">
                    {caseData?.gender || "--"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t("ageRange")}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white px-3 py-2">
                    {caseData?.ageRange || "--"}
                  </p>
                </div>
              </div>
              {caseData?.problemDescription && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t("problemDescription")}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white px-3 py-2 whitespace-pre-wrap">
                    {caseData.problemDescription}
                  </p>
                </div>
              )}
              {caseData?.xrayUrl && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t("xray")}
                  </label>
                  <a
                    href={caseData.xrayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={caseData.xrayUrl}
                      alt="X-Ray"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                    />
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {/* Country */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t("country")}
                  </label>
                  <select
                    value={caseData?.country || ""}
                    onChange={(e) => handleFieldChange("country", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">--</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t("gender")}
                  </label>
                  <select
                    value={caseData?.gender || ""}
                    onChange={(e) => handleFieldChange("gender", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">--</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{t(`gender_${g.toLowerCase()}`)}</option>
                    ))}
                  </select>
                </div>

                {/* Age Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t("ageRange")}
                  </label>
                  <select
                    value={caseData?.ageRange || ""}
                    onChange={(e) => handleFieldChange("ageRange", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">--</option>
                    {AGE_RANGES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Problem Description */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t("problemDescription")}
                </label>
                <textarea
                  value={caseData?.problemDescription || ""}
                  onChange={(e) => handleFieldChange("problemDescription", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  placeholder={t("problemDescription")}
                />
              </div>

              {/* X-Ray Upload */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t("xray")}
                </label>
                {caseData?.xrayUrl ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={caseData.xrayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={caseData.xrayUrl}
                        alt="X-Ray"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                    </a>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-teal-600 hover:text-teal-700"
                    >
                      {t("upload")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-teal-500 hover:text-teal-600 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {uploading ? t("uploading") : t("upload")}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.dcm"
                  onChange={handleUpload}
                  className="hidden"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
