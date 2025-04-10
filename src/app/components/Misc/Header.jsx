// src/app/components/Misc/Header.jsx

export default function Header() {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-bold text-gray-200 flex items-center">
        <img src="lego_logo.png" className="mr-2 w-10 h-10 aspect-square" />{" "}
        Piece Manager
      </h1>
      <p className="text-gray-200">
        Track your LEGO pieces inventory and needs
      </p>
    </header>
  );
}
