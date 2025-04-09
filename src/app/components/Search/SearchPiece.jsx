import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

export default function SearchPiece({ searchTerm, setSearchTerm }) {
  return (
    <div className="relative">
      <SearchOutlinedIcon
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-100"
        size={18}
      />
      <input
        type="text"
        placeholder="Search pieces..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 py-2 pr-4 border border-gray-300 text-gray-100 placeholder:text-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
