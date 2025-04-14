// src/app/Components/Misc/Footer.jsx

import React from "react";

const Footer = ({ className }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={` ${className} switch:mt-8 mt-12 py-8 px-4 bg-slate-800 border-t border-slate-700`}
    >
      {" "}
      <div className="max-w-[100rem] mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        {" "}
        <span className="text-sm text-slate-400">
          {" "}
          © {currentYear} Clomby. All rights reserved.{" "}
        </span>{" "}
        <div className="flex space-x-4 mt-2 md:mt-0">
          {" "}
          <a
            href="https://github.com/SgtClubby/LegoInventory"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {" "}
            GitHub{" "}
          </a>{" "}
          <a
            href="/about"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {" "}
            About{" "}
          </a>{" "}
          <a
            href="/privacy"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {" "}
            Privacy Policy{" "}
          </a>{" "}
        </div>{" "}
      </div>{" "}
    </footer>
  );
};

export default Footer;
