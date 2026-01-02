import LogoutButton from "./LogoutButton";

const ReportHeader = () => {
  return (
    <header className="report-header py-4 px-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div
          className="p-0 rounded-lg overflow-hidden"
          style={{ width: 140, height: 48 }}
        >
          <img
            src="/cacpm_logo.png"
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
            className="p-0 rounded-lg overflow-hidden"
            style={{ width: 140, height: 48 }}
          >
            <img
              src="/koica_logo.png"
              alt="KOICA"
              className="object-contain w-full h-full"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default ReportHeader;
