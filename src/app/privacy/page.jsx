// src/app/privacy/page.jsx

import React from "react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white px-4 md:px-8 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>

        <section className="space-y-4">
          <p className="text-slate-300">
            This project is a self-hosted web application designed to manage
            personal LEGO® inventories. It does not collect, transmit, or store
            any personal data by default.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Data Storage</h2>
          <p className="text-slate-300">
            All inventory data is stored locally by the user in their own
            database (e.g., MongoDB) during self-hosted operation. This data is
            not accessible by the project author or any third party unless the
            user chooses to share it.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">
            Analytics & Tracking
          </h2>
          <p className="text-slate-300">
            This application does not include any form of analytics, tracking
            scripts, cookies, or third-party data collection.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">
            External API Use
          </h2>
          <p className="text-slate-300">
            This project utilizes the Rebrickable API to retrieve publicly
            available LEGO set and piece data. API requests are made directly
            from the client or server as configured by the user. Users are
            responsible for adhering to Rebrickable’s{" "}
            <a
              href="https://rebrickable.com/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              API Terms of Use
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">
            Self-Hosting Responsibility
          </h2>
          <p className="text-slate-300">
            If you choose to self-host this application, you are solely
            responsible for the configuration, hosting environment, and any data
            stored within your deployment. The author of this project does not
            provide hosting, logging, or analytics.
          </p>
        </section>

        <section className="pt-4 border-t border-slate-700">
          <p className="text-slate-400 text-sm">
            This project is developed as a passion project and provided as-is
            under the MIT License. Questions or concerns? Feel free to open an
            issue on the{" "}
            <a
              href="https://github.com/SgtClubby/legoinventory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
