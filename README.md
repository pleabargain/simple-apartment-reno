# Simple Apartment Renovation Planner

A web-based application for planning and managing apartment renovation projects. This application allows users to organize renovation plans room by room, including the kitchen, living room, bedrooms, and bathrooms.

## Getting Started

### Prerequisites
- Python 3.x installed on your system
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Starting the Server

To run the application, follow these steps:

1. Open a terminal/command prompt
2. Navigate to the project directory
3. Run the Python server using the command:
```bash
python server.py
```
4. The server will start on http://localhost:8000
5. Open your web browser and visit http://localhost:8000 to access the application

## Project Structure

```
.
├── bathroom/              # Bathroom renovation planning
├── bedroom/              # Bedroom renovation planning
├── guest-bathroom/       # Guest bathroom renovation planning
├── kitchen/             # Kitchen renovation planning
├── living-room/         # Living room renovation planning
├── master-bathroom/     # Master bathroom renovation planning
├── js/                 # JavaScript modules
│   ├── errorHandling.js
│   ├── fileManagement.js
│   ├── itemManagement.js
│   ├── main.js
│   ├── ollamaIntegration.js
│   ├── uiManager.js
│   └── validation.js
├── index.html          # Main application entry point
└── server.py          # Python HTTP server with CORS support
```

## Usage

1. Launch the application by starting the server and visiting http://localhost:8000
2. Navigate through different rooms using the main interface
3. Each room section allows you to:
   - View room-specific renovation plans
   - Manage renovation items and tasks
   - Import/export data using CSV or JSON formats
   - View and manage room-specific images

## Features

- Room-by-room renovation planning
- CSV and JSON data import/export functionality
- Image management for each room
- Error handling and validation
- User-friendly interface for managing renovation items

## File Formats

The application supports two data formats:
- CSV files for simple data storage and spreadsheet compatibility
- JSON files for more complex data structures and better data portability

Sample data files are provided for each room to help you get started.
