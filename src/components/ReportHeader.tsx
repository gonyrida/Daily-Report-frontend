import { useState, useEffect, useRef } from "react";
// import PanoramicCropModal from "./PanoramicCropModal";

interface ReportHeaderProps {
  isAutoSaving?: boolean;
  lastSavedAt?: Date | null;
  projectLogo?: string;
  setProjectLogo?: (logo: string) => void;
}

const ReportHeader = ({ isAutoSaving = false, lastSavedAt = null, projectLogo, setProjectLogo }: ReportHeaderProps) => {
  const projectLogoInputRef = useRef<HTMLInputElement>(null);
  const [cacpmLogo, setCacpmLogo] = useState<string>("/cacpm_logo.png");
  const [koicaLogo, setKoicaLogo] = useState<string>("/koica_logo.png");
  const cacpmInputRef = useRef<HTMLInputElement>(null);
  const koicaInputRef = useRef<HTMLInputElement>(null);

  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [modalSrc, setModalSrc] = useState<string | null>(null);
  // const [modalTarget, setModalTarget] = useState<"cacpm" | "koica" | null>(null);

  // Load custom logos from localStorage on mount
  useEffect(() => {
    const savedCacpm = localStorage.getItem("customCacpmLogo");
    const savedKoica = localStorage.getItem("customKoicaLogo");

    if (savedCacpm) setCacpmLogo(savedCacpm);
    if (savedKoica) setKoicaLogo(savedKoica);
  }, []);

  const resizeImageWithFixedHeight = (dataUrl: string, fixedHeight: number) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Force fixed dimensions: 252x94
      canvas.width = 252;  // Fixed width
      canvas.height = 94;  // Fixed height
      
      // Draw image with fixed dimensions
      ctx.drawImage(img, 0, 0, 252, 94);
      
      // Save to localStorage
      const resizedDataUrl = canvas.toDataURL('image/png');
      setProjectLogo(resizedDataUrl);
      
      // if (logoType === "cacpm") {
      //   setCacpmLogo(resizedDataUrl);
      //   localStorage.setItem("customCacpmLogo", resizedDataUrl);
      // } else {
      //   setKoicaLogo(resizedDataUrl);
      //   localStorage.setItem("customKoicaLogo", resizedDataUrl);
      // }
    };
    img.src = dataUrl;
  };

  const handleLogoClick = (logoType: "cacpm" | "koica") => {
    if (logoType === "koica") {
    //   cacpmInputRef.current?.click();
    // } else {
      koicaInputRef.current?.click();
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    logoType: "cacpm" | "koica"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Use the resize function with original width + fixed height
      resizeImageWithFixedHeight(result, 94);
    };
    reader.readAsDataURL(file);
  };

  // const handleModalSave = (dataUrl: string) => {
  //   if (modalTarget === "cacpm") {
  //     setCacpmLogo(dataUrl);
  //     localStorage.setItem("customCacpmLogo", dataUrl);
  //   } else if (modalTarget === "koica") {
  //     setKoicaLogo(dataUrl);
  //     localStorage.setItem("customKoicaLogo", dataUrl);
  //   }
  //   setIsModalOpen(false);
  //   setModalSrc(null);
  //   setModalTarget(null);
  // };

  // const handleModalCancel = () => {
  //   setIsModalOpen(false);
  //   setModalSrc(null);
  //   setModalTarget(null);
  // };

  return (
    <header className="report-header py-4 px-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div
          className="p-0 rounded-lg overflow-hidden relative"
          style={{ width: 140, height: 48 }}
          // onClick={() => handleLogoClick("cacpm")}
          // title="Click to replace CACPM logo"
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
          {/* Auto-save status indicator */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {isAutoSaving && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Saving...</span>
              </div>
            )}
            {!isAutoSaving && lastSavedAt && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Saved {lastSavedAt.toLocaleTimeString()}</span>
              </div>
            )}
            {!isAutoSaving && !lastSavedAt && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Unsaved changes</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div
            className="p-0 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative border-2 border-dashed border-gray-300 hover:border-gray-400"
            style={{ width: 140, height: 48 }}
            onClick={() => projectLogoInputRef.current?.click()}
            title="Click to upload project logo"
          >
            <img
              src={projectLogo || "/koica_logo.png"}
              alt="Project Logo"
              className="object-contain w-full h-full"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* {isModalOpen && modalSrc && (
        <PanoramicCropModal src={modalSrc} onCancel={handleModalCancel} onSave={handleModalSave} />
      )} */}

      {/* Hidden file inputs */}
      {/* <input
        ref={cacpmInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, "cacpm")}
        style={{ display: "none" }}
      /> */}
      {/* <input
        ref={koicaInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, "koica")}
        style={{ display: "none" }}
      /> */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              // Use the resize function
              resizeImageWithFixedHeight(result, 94);  // ← CHANGE THIS
            };
            reader.readAsDataURL(file);
          }
        }}
        style={{ display: "none" }}
        ref={projectLogoInputRef}
      />
    </header>
  );
};

export default ReportHeader;
