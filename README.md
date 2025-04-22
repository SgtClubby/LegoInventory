# Lego Inventory Piece Manager

A modern web application for organizing and tracking your LEGO® collection — built with **Next.js**, **MongoDB**, and a whole lot of curiosity.

> What started as a simple side project has grown far beyond its roots.  
> It’s now a full-featured tool that I figured deserved to be shared.

![Version](https://img.shields.io/badge/LegoInventory-1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Inventory Management**: Keep track of your LEGO pieces, including quantities on hand and required
- **Set Import**: Import sets directly from the Rebrickable API
- **Color Support**: View and filter pieces by their colors
- **Multi-Table Organization**: Organize pieces into different tables (collections)
- **Search Functionality**: Find pieces by name, ID, or color
- **Import/Export**: Save and load your inventory data
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS 4
- **UI Components**: Material UI (MUI) 7
- **Database**: MongoDB with Mongoose
- **Virtualization**: TanStack Virtual for efficient rendering of large lists
- **External API**: Integration with Rebrickable API for piece and set data

## Screenshots

_[Screenshots will be added here]_

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB connection string
- Rebrickable API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/SgtClubby/legoinventory.git
cd legoinventory
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Create a `.env` file in the root directory with the following variables:

```
REBRICKABLE_APIKEY=<your_rebrickable_api_key>
MONGODB_URI=<your_mongodb_connection_string>
MONGODB_DB=<your_database_name>

MONGODB_PARAMS=<your_optional_mongodb_params>
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## General Overview and Usage

### Adding Pieces

1. Use the "Add New Piece" form at the top of the page
2. Search for pieces using the search field
3. Fill in the required fields (name, ID, color)
4. Set quantities on hand and required
5. Click "Add Piece"

### Importing Sets

1. Use the "Import set?" search field
2. Select a set from the search results
3. Confirm the import in the modal
4. Wait for the import to complete (all pieces will be added to a new table)

### Managing Tables

1. Use the "Select Table" dropdown to switch between tables
2. Click "Add" to create a new table
3. Click "Remove" to delete the current table (Main table cannot be deleted)

### Searching and Filtering

- Use the search field to filter pieces by name, ID, or color
- Click column headers to sort by that column

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for full details.

> This is a personal passion project. Feel free to explore, use, and build on it!  
> If you find it useful or make something cool with it, I'd love to hear about it.

## Acknowledgements

- [Rebrickable API](https://rebrickable.com/api/) for providing LEGO set and piece data
- [Next.js](https://nextjs.org/) for the React framework
- [TailwindCSS](https://tailwindcss.com/) for styling
- [MongoDB](https://www.mongodb.com/) for database storage
- [Material UI Icons](https://mui.com/) for UI components
- [TanStack Virtual](https://tanstack.com/virtual) for efficient rendering of large lists
- [Lodash](https://lodash.com/) for utility functions

## BrickLink Data Usage Disclaimer
This project uses limited web scraping to extract publicly available data from BrickLink.com in order to supplement some LEGO minifig metadata and general price information.

- BrickLink does not provide a public API for the specific data accessed.
- Scraping is performed conservatively, with extensive cachinging, rate-limiting, and logic designed to minimize requests sent and server load.
- No scraping is done for resale, redistribution, or commercial purposes—data is used solely within this app for personal LEGO minifig inventory management.
- If you are a BrickLink representative and have concerns about this usage, please open an issue or contact me directly so we can address it respectfully.
- We encourage users to support BrickLink and its sellers by visiting the official site for purchases and detailed product listings.

## Disclaimers
LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize or endorse this application.
