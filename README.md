# MedHunter 2.0 🚀

MedHunter 2.0 is a comprehensive platform designed to connect users with nearby pharmacies (shops) to find medicines easily. The project features a dual-architecture system: a main application for end-users to search and locate medicines using interactive maps, and a dedicated barcode scanning module (`bar_sc`) for shop owners to efficiently manage their inventory.

## 💡 The Idea
The core problem MedHunter solves is the difficulty of finding specific medicines in local pharmacies. Instead of physically visiting multiple shops, users can use MedHunter to search for a medicine and see which nearby shops have it in stock on an interactive map. 
For shop owners, maintaining a digital inventory is streamlined through a specialized barcode scanning web application that instantly registers and updates medicine stock levels in the database.

---

## 🏗️ Project Architecture & Technologies Used

The project is divided into **four main parts**: two backends and two frontends.

### 1. Main User Application (Frontend)
Located in `/frontend`, this is the primary portal for users to search for medicines and view nearby pharmacies.
- **Framework:** React + Vite
- **Styling:** TailwindCSS
- **Maps:** Leaflet & React-Leaflet (for interactive maps showing shop locations)
- **Animations:** Framer Motion
- **Routing:** React Router DOM
- **Port:** Runs on **5173** (Default Vite Port)

### 2. Main API Server (Backend)
Located in the root directory (`/`), this Express server handles user authentication, medicine searches, and core business logic.
- **Framework:** Node.js + Express.js (v5.2.1)
- **Database:** MongoDB with Mongoose
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **File Uploads:** Multer & Cloudinary (for storing images like shop banners or user avatars)
- **Models:** `User`, `Shop`, `Medicine`
- **Port:** Runs on **8080** (As indicated by the Vite proxy configuration)

### 3. Barcode Scanner Application (Frontend)
Located in `/bar_sc/frontend`, this is a dedicated tool for shop owners to scan medicine barcodes.
- **Framework:** React (Create React App)
- **Barcode Scanning:** html5-qrcode
- **Testing:** Jest & React Testing Library
- **Port:** Runs on **3000** (Default CRA Port)

### 4. Barcode Scanner API Server (Backend)
Located in `/bar_sc`, this separate backend handles inventory updates from the barcode scanner.
- **Framework:** Node.js + Express.js
- **Database:** MongoDB with Mongoose
- **Core Functionality:** Adds medicines, updates inventory count upon scanning.
- **Models:** `medicine`, `inventory`
- **Port:** Runs on **5000**

---

## 🔌 Port Mapping & Services Summary

If you run all services locally, here is where everything will be hosted:

| Service | Directory | Tech Stack | Default Port |
|---------|-----------|------------|--------------|
| **Main Frontend** | `/frontend` | React (Vite) | `http://localhost:5173` |
| **Main Backend** | `/` (root) | Node/Express | `http://localhost:8080` |
| **Scanner Frontend** | `/bar_sc/frontend` | React (CRA) | `http://localhost:3000` |
| **Scanner Backend** | `/bar_sc` | Node/Express | `http://localhost:5000` |

---

## 🚀 How to Run the Project

You will need to open four separate terminal windows to run all parts of the application simultaneously.

### Prerequisites
- Node.js installed
- MongoDB URI (Set up your `.env` files with a `MONGO_URI`)
- Cloudinary credentials (in the main backend `.env` file)

### 1. Start the Main Backend
Create a `.env` file in the root directory with `PORT=8080`, `MONGO_URI`, and your Cloudinary/JWT secrets.
```bash
cd MEDHUNTER_2.0
npm install
npm start
```

### 2. Start the Main Frontend
```bash
cd MEDHUNTER_2.0/frontend
npm install
npm run dev
```

### 3. Start the Scanner Backend
Create a `.env` file in `bar_sc/` with `MONGO_URI`.
```bash
cd MEDHUNTER_2.0/bar_sc
npm install
node server.js
```

### 4. Start the Scanner Frontend
```bash
cd MEDHUNTER_2.0/bar_sc/frontend
npm install
npm start
```
