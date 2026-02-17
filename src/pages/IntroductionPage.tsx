import React from "react";

const IntroductionPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h2 className="text-2xl font-bold mb-4">INTRODUCTION</h2>
      {/* Project Overview */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Project Overview</h3>
        <textarea
          className="w-full border border-gray-300 rounded-md p-2 min-h-[80px] resize-vertical mb-4"
          placeholder="Enter a detailed project overview..."
        />
      </div>
      {/* Design & Construction */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          Design &amp; Construction
        </h3>
        <textarea
          className="w-full border border-gray-300 rounded-md p-2 min-h-[80px] resize-vertical mb-4"
          placeholder="Enter design & construction details..."
        />
        <ul className="list-disc ml-6 space-y-1">
          <li>Design phase completed</li>
          <li>Construction phase ongoing</li>
          <li>Key milestones achieved</li>
          {/* Add more items as needed */}
        </ul>
      </div>
      {/* Cover Image (from cover tab) */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Cover Image</h3>
        {/* Replace the src with the actual cover image path or component from the cover tab */}
        <div className="w-full max-w-md border border-gray-200 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center h-48">
          <span className="text-gray-400">Cover image will appear here</span>
        </div>
      </div>
    </div>
  );
};

export default IntroductionPage;
