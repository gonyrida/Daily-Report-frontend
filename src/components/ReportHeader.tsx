import { useState, useEffect, useRef } from "react";
import LogoutButton from "./LogoutButton";

const ReportHeader = () => {
  const [cacpmLogo, setCacpmLogo] = useState<string>("/cacpm_logo.png");
  const [koicaLogo, setKoicaLogo] = useState<string>("/koica_logo.png");
  const cacpmInputRef = useRef<HTMLInputElement>(null);
  const koicaInputRef = useRef<HTMLInputElement>(null);

  // Load custom logos from localStorage on mount
  useEffect(() => {
    const savedCacpm = localStorage.getItem("customCacpmLogo");
    const savedKoica = localStorage.getItem("customKoicaLogo");

    if (savedCacpm) setCacpmLogo(savedCacpm);
    if (savedKoica) setKoicaLogo(savedKoica);
  }, []);

  const handleLogoClick = (logoType: "cacpm" | "koica") => {
    if (logoType === "cacpm") {
      cacpmInputRef.current?.click();
    } else {
      koicaInputRef.current?.click();
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    logoType: "cacpm" | "koica"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (logoType === "cacpm") {
        setCacpmLogo(result);
        localStorage.setItem("customCacpmLogo", result);
      } else {
        setKoicaLogo(result);
        localStorage.setItem("customKoicaLogo", result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <header className="report-header py-4 px-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div
          className="p-0 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          style={{ width: 140, height: 48 }}
          onClick={() => handleLogoClick("cacpm")}
          title="Click to replace CACPM logo"
        >
          <img
            src={cacpmLogo}
            alt="CACPM"
            className="object-contain w-full h-full"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold tracking-tight">DAILY REPORT</h1>
          {/* <p className="text-primary-foreground/80 text-sm font-medium">
            Construction Project Management
          </p> */}
        </div>

        <div className="flex items-center space-x-4">
          <LogoutButton />
          <div
            className="p-0 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            style={{ width: 140, height: 48 }}
            onClick={() => handleLogoClick("koica")}
            title="Click to replace KOICA logo"
          >
            <img
              src={koicaLogo}
              alt="KOICA"
              className="object-contain w-full h-full"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cacpmInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, "cacpm")}
        style={{ display: "none" }}
      />
      <input
        ref={koicaInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, "koica")}
        style={{ display: "none" }}
      />
    </header>
  );
};

export default ReportHeader;
