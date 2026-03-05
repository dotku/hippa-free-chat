"use client";

import { useTranslations } from "next-intl";

interface BlockedAlertProps {
  reason: string;
  categories: string[];
  onDismiss: () => void;
}

const categoryLabels: Record<string, string> = {
  patient_name: "Patient Name",
  ssn: "Social Security Number",
  medical_record_number: "Medical Record Number",
  date_of_birth: "Date of Birth",
  diagnosis_treatment: "Diagnosis/Treatment Details",
  insurance_billing: "Insurance/Billing Info",
  contact_information: "Contact Information",
  biometric_data: "Biometric Data",
  medical_images: "Medical Images",
  prescription_details: "Prescription Details",
  scan_error: "Scan Error",
};

export default function BlockedAlert({
  reason,
  categories,
  onDismiss,
}: BlockedAlertProps) {
  const t = useTranslations("chat");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
            {t("blocked")}
          </h3>
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-3">
          {t("blockedReason")}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-3">
          {reason}
        </p>

        {categories.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("blockedCategories")}
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full"
                >
                  {categoryLabels[cat] || cat}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t("blockedTip")}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
        >
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}
