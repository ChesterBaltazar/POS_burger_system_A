# 🍔 Angelo's Burger POS System

> A web-based Point of Sale (POS) system developed for **Angelo's Burger**, a local food business owned by **Nelia Flores Polledo**, located at Bagong Buhay II, Sampol Market, in front of 7 Eleven, CSJDM, Bulacan.

**Bestlink College of the Philippines** — IPO Road, Barangay Minuyan Proper, City of San Jose Del Monte, Bulacan


## 👥 Team

| Name | Role |
|---|---|
| Jessa Lingahan | Project Manager |
| Andrei Heather Quintos | System Analyst |
| Chester Baltazar | Programmer |
| Axl Ron Bunao | Document Specialist |
| Jomari Corre | Business Specialist |


## 📋 Table of Contents

- [Project Background](#-project-background)
- [Features](#-features)
- [Project Scope](#-project-scope)
- [Tech Stack](#-tech-stack)
- [System Requirements](#-system-requirements)
- [Security](#-security)
- [Out of Scope](#-out-of-scope)
- [Team & Budget](#-team--budget)
- [Related Systems](#-related-systems)
- [Testing](#-test-procedures)
- [License & Policies](#-policies--legal-compliance)


## 📖 Project Background

Angelo's Burger is a small local food business offering burgers and snacks. Daily operations — order taking, sales recording, and inventory checks — were all done manually, leading to:

- Slow transactions and errors in computation
- Misplaced records and difficulty monitoring stocks during peak hours
- No visibility into sales performance or monthly comparisons
- Cash-only payments limiting customer convenience

This project proposes a **web-based POS system** that automates order processing, tracks inventory in real-time, and generates sales reports — improving efficiency, accuracy, and overall service quality.


## ✨ Features

| Feature | Description |
|---|---|
| **Sales Performance Dashboard** | Displays real-time sales data including total sales, profit, today's orders, and total customers. Auto-updates on each completed transaction. |
| **Stock Monitoring with Low Stock Alerts** | Tracks item quantities as sales are made. Triggers automatic alerts when stock reaches a set minimum threshold. |
| **Sales Report with Month-to-Month Comparison** | Generates monthly summaries of total sales, profit, and key metrics. Includes comparison with previous months to identify trends. |
| **Digital Wallet Payment Method** | Supports e-wallet payments in addition to cash, increasing convenience and reducing lost sales. |
| **Digital Order Logging** | Automatically records all transactions upon completion, maintaining a full, transparent history for admin review. |


## 🔍 Project Scope

### User Account Management
- **Role Management** — Admin and Staff roles with permission-based access
- **Account Administration** — Create and delete user accounts
- **Authentication** — Secure username and password login

### Point of Sale / Transaction Processing
- Order Management (create, update, complete orders)
- Menu display with item names and prices
- Payment handling (cash and digital wallet)
- Digital receipt generation (print-ready)
- Order logging for auditing
- Automatic total and change calculation

### Inventory / Stock Management
- Stock In / Stock Out tracking
- Stock updates without modifying other product details
- Stock archiving (no permanent deletion)
- Stock overview with low stock alerts

### Sales Reports & Analytics
- Monthly sales summaries (profit, total items sold, total orders, avg. items per order)
- Month-to-month performance comparison
- Export and print reports (Excel, PDF)

### Dashboard
- Total Sales today
- Profit today
- Today's Orders count
- Total Customers today


## 🛠 Tech Stack

| Technology | Role |
|---|---|
| HTML / CSS | UI structure and styling |
| JavaScript | Core functionality and interactivity |
| Node.js | Server-side JavaScript runtime |
| Express.js | Backend web framework |
| EJS (Embedded JavaScript) | Dynamic HTML templating |
| MongoDB | NoSQL database for flexible data storage |
| Git / Git Bash | Version control |
| Visual Studio Code 1.107.1 | IDE |


## 💻 System Requirements

### Hardware

| Specification | Minimum | Maximum |
|---|---|---|
| Processor | Intel Core i5-7th @ 1.7GHz | Intel Core i5-12th, 2.7GHz |
| RAM | 8 GB | 16 GB |
| Device | Dell Laptop | Vivobook |

### Software

| Software | Role |
|---|---|
| Microsoft Windows 10 Education | Operating System |
| MongoDB Compass | Database |
| Node.js | JavaScript Runtime |
| Express.js | Backend Framework |
| EJS | Frontend Templating |
| Git | Version Control |
| Visual Studio Code 1.107.1 | IDE |


## 🔒 Security

- **Access Control** — Role-based permissions restrict access to sensitive features
- **JWT (JSON Web Token)** — Secure token-based authentication between client and server
- **Hashed Passwords** — Passwords stored using a hashing algorithm; never stored in plain text
- **Account Expiration** — Inactive accounts automatically deactivated
- **Token Expiration** — Auth tokens expire after a set time, requiring re-authentication


## 🚫 Out of Scope

The following are **not included** in this system:

1. Inventory purchasing & supplier management
2. Employee payroll & scheduling
3. Customer refunds & returns
4. Full accounting & bookkeeping (taxes, ledgers)
5. Advanced order customization
6. Loyalty & rewards programs


## 📦 Deliverables

| Deliverable | Description |
|---|---|
| Log In / Log Out | Secure system access |
| Add / Edit Product | Manage product catalog |
| Archive Product | Soft-delete products without data loss |
| Complete Order | Finalize customer transactions |
| Account Creation | Admin creates and manages staff accounts |
| Category Management | Organize products by category |
| Stock Request | Staff requests additional stock |
| Sales Dashboard | Total orders, sales, profit, customers |
| Low Stock Alert | Notifications for near-empty inventory |
| Out of Stock Indicator | Flags items with zero quantity |
| Printable Receipt | Customer-ready digital receipt |
| Sales Report | Monthly summary with comparisons |
| Order Log | Complete transaction history |
| Revenue & Profit display | Financial metrics |


## 💰 Project Budget

| Item | Cost |
|---|---|
| Laptop (personal) | ₱30,000 |
| Transportation Expenses | ₱357.00 |
| Data Load | ₱250.00 |
| Phone | ₱15,000 |
| Wi-Fi Subscription | ₱2,997 |
| Foods and Drinks | ₱1,500 |
| **Total** | **₱49,187.00** |


## 📚 Related Systems (Comparative Analysis)

| Feature | KaHero | Kwenta | UTAK | KwickPOS | Toast | Foodics | This Project |
|---|---|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inventory | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Print Receipt | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Payment Method | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Low Stock Alert | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Order Log | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Archive | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Account Creation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |


## 🧪 Test Procedures

| # | Procedure | Input | Expected Outcome |
|---|---|---|---|
| 1 | Login (Valid) | Correct credentials | Redirected to dashboard |
| 2 | Login (Invalid) | Incorrect credentials | Error message displayed |
| 3 | Add New Product | Name, price, quantity | Product added to inventory |
| 4 | Edit Product | Updated details | Product info updated |
| 5 | Archive Product | Select & archive | Removed from active list |
| 6 | Restore Product | Select archived item | Returns to active inventory |
| 7 | Process Order | Selected items, confirmed order | Order recorded, total correct |
| 8 | Inventory Update | Completed transaction | Stock auto-reduced |
| 9 | Generate Report | Date range selected | Sales report displays correctly |
| 10 | Logout | Click logout | Returned to login page |


## ⚖️ Policies & Legal Compliance

This system complies with the following Philippine laws:

- **Republic Act No. 386** — Civil Code of the Philippines (Breach of Contract)
- **Republic Act No. 8293** — Intellectual Property Code (Copyright Protection, Software Piracy)
- **Republic Act No. 10175** — Cybercrime Prevention Act of 2012
- **Republic Act No. 8792** — Electronic Commerce Act of 2000


## 🔄 Development Methodology

The project follows **Agile methodology** with **SDLC phases**:

1. **Planning** — Client interviews, role assignments, project timeline
2. **Analysis** — Deep-dive into business workflows and system requirements
3. **Design** — Clean, role-based UI accessible on desktop and mobile
4. **Development** — Iterative sprint-based builds; core features first, enhancements after
5. **Testing** — Full functional testing across desktops, laptops, and smartphones
6. **Implementation** — Deployment with training seminars and live demos
7. **Maintenance** — Continuous monitoring, backups, and security checks

---

*Developed as a thesis research project at Bestlink College of the Philippines, S.Y. 2025–2026.*
