import { useRef } from 'react';
import { Send, Paperclip, Image as ImageIcon } from 'lucide-react';

export default function MessageInput({ value, onChange, onSend, onSendFiles }) {
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // ---- File / Image Triggers ----
  const handleImageClick = () => imageInputRef.current?.click();
  const handleFileClick = () => fileInputRef.current?.click();

  const handleImageChange = (e) => {
    if (e.target.files?.length > 0) {
      onSendFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      onSendFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="px-6 py-4 bg-[#F5F5F5] border-t border-[#D0D7DE]">
      <div className="flex items-center gap-3">

        {/* Hidden Inputs */}
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          onChange={handleImageChange}
          className="hidden"
        />

        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Image Button */}
        <button
          type="button"
          onClick={handleImageClick}
          className="p-2 rounded-full hover:bg-gray-200 transition"
          title="Upload image"
        >
          <ImageIcon className="w-5 h-5 text-gray-600" />
        </button>

        {/* File Button */}
        <button
          type="button"
          onClick={handleFileClick}
          className="p-2 rounded-full hover:bg-gray-200 transition"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5 text-gray-600" />
        </button>

        {/* Textarea (from Code 1 style) */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Shift+Enter for new line)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none bg-white focus:outline-none focus:ring-2 focus:ring-[#0066CC] text-sm"
          rows="2"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={onSend}
          className="px-4 py-2 bg-[#0066CC] hover:bg-[#0052A3] text-white rounded-lg flex items-center gap-2 transition shadow-sm"
        >
          <Send className="w-5 h-5" />
          <span className="text-sm font-medium">Send</span>
        </button>

      </div>
    </div>
  );
}
