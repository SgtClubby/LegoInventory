# Lego Inventory Piece Manager

A modern web application for tracking your LEGO® piece inventory and needs. Built with Next.js and MongoDB.

![LegoInventory](https://img.shields.io/badge/LegoInventory-1.0-blue)
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

## Usage

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

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Rebrickable API](https://rebrickable.com/api/) for providing LEGO set and piece data
- [Next.js](https://nextjs.org/) for the React framework
- [TailwindCSS](https://tailwindcss.com/) for styling
- [MongoDB](https://www.mongodb.com/) for database storage

## Disclaimer

LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize or endorse this application.
