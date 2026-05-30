// file:///c:/0-Music%20Fun/Backups/backup%20for%20firestore/src/components/PEOSection.jsx
import React, { useState } from 'react';

export default function PEOSection({ 
  initialData = {}, 
  onSave = () => {}, 
  onCancel = () => {} 
}) {
  const [myName, setMyName] = useState(initialData.myName || '');
  const [myLittleOne, setMyLittleOne] = useState(initialData.myLittleOne || '');
  const [hyperlink, setHyperlink] = useState(initialData.hyperlink || '');
  const [coverImageName, setCoverImageName] = useState(initialData.coverImageName || '');
  const [selectedBorder, setSelectedBorder] = useState(initialData.selectedBorder || '#22c55e');
  const [selectedIcon, setSelectedIcon] = useState(initialData.selectedIcon || '');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImageName(file.name);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSave({
      myName,
      myLittleOne,
      hyperlink,
      coverImageName,
      selectedBorder,
      selectedIcon
    });
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* FORCE ALL PEO ELEMENTS INSIDE THIS SINGLE VERTICAL STACK */}
        <h3 className="text-xl font-bold text-center">PEO Information</h3>
        
        {/* Antigravity: Put the inputs here in a clean, vertical line */}
        <form onSubmit={handleFormSubmit} className="space-y-4 flex flex-col w-full">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-white">Adult's Name</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-800 rounded bg-[#2a2625] text-white"
              placeholder="Adult's 1st Name"
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-white">Child's Name</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-800 rounded bg-[#2a2625] text-white"
              placeholder="Child's 1st Name"
              value={myLittleOne}
              onChange={(e) => setMyLittleOne(e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-white">PEO Hyperlink</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-800 rounded bg-[#2a2625] text-white"
              placeholder="https://..."
              value={hyperlink}
              onChange={(e) => setHyperlink(e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-white">Upload Cover Image</label>
            <div className="flex items-center space-x-2">
              <label className="cursor-pointer bg-stone-700 text-white px-3 py-2 rounded text-sm hover:bg-stone-600 transition">
                Choose File
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </label>
              <span className="text-sm text-stone-300 truncate">
                {coverImageName || 'No file chosen'}
              </span>
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-white">Border Color</label>
            <input 
              type="color" 
              className="w-full h-10 p-1 border border-stone-800 rounded bg-[#2a2625]"
              value={selectedBorder}
              onChange={(e) => setSelectedBorder(e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-white">Sticker Icon Name</label>
            <input 
              type="text" 
              className="w-full p-2 border border-stone-800 rounded bg-[#2a2625] text-white"
              placeholder="Sticker file name (e.g. Star.svg)"
              value={selectedIcon}
              onChange={(e) => setSelectedIcon(e.target.value)}
            />
          </div>

          <div className="flex space-x-2 pt-2">
            <button 
              type="submit" 
              className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-500 transition font-bold"
            >
              Save
            </button>
            <button 
              type="button" 
              onClick={onCancel}
              className="flex-1 bg-stone-700 text-white p-2 rounded hover:bg-stone-600 transition font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
